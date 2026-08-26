from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from models.detect_anomaly import detect_anomalies
from models.live_detect import start_session, stop_session, score_frame, narrate_session
from models.train_jobs import start_training, get_job
from utils.narration_client import get_gemini_video_narration
from utils.video_utils import reencode_mp4_to_h264
from utils import store
import json
import os
import re
import uuid
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS so the React frontend can call this API
UPLOAD_FOLDER = "uploads/uploaded_videos"
ANOMALOUS_CLIPS_FOLDER = "uploads/anomalous_clips"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ANOMALOUS_CLIPS_FOLDER, exist_ok=True)
store.init_db()

def safe_output_name(name, fallback_stem="clip"):
    """Sanitise a client-supplied filename so it cannot escape its directory."""
    cleaned = secure_filename(name or "")
    if not cleaned:
        # secure_filename returns "" for names that are entirely unsafe
        # characters (e.g. "..", or a purely non-ASCII name).
        cleaned = f"{fallback_stem}_{uuid.uuid4().hex}.mp4"
    return cleaned

def resolve_uploaded_video(candidate):
    """
    Resolve a client-supplied video path, confined to the uploads directory.
    Returns None if the path escapes it or does not exist.
    """
    if not candidate:
        return None
    root = os.path.realpath(UPLOAD_FOLDER)
    resolved = os.path.realpath(os.path.join(root, os.path.basename(candidate)))
    if os.path.commonpath([root, resolved]) != root:
        return None
    return resolved if os.path.isfile(resolved) else None

@app.route("/upload", methods=["POST"])
def handle_upload():
    video = request.files.get("video")
    mode = request.form.get("mode")

    if not video or not mode:
        return jsonify({"error": "Missing video or mode"}), 400

    filename = safe_output_name(video.filename, fallback_stem="upload")
    path = os.path.join(UPLOAD_FOLDER, filename)
    video.save(path)

    if mode == "train":
        # Training runs in the background; the client polls /train/status/<id>.
        job_id = start_training(path, filename)
        return jsonify({"job_id": job_id, "message": "Training started"}), 202

    elif mode == "detect":
        sigma = request.form.get("sigma", type=float)
        result = detect_anomalies(path, sigma=sigma)
        # detect_anomaly returns "frames_with_anomaly", not "anomalies"
        anomaly_frames = result.get("frames_with_anomaly") or result.get("anomalies") or []

        if anomaly_frames and len(anomaly_frames) > 0:
            try:
                first_anomaly_frame = int(anomaly_frames[0])
                output_filename = f"anomalous_clip_{first_anomaly_frame}.mp4"
                clip_path = extract_anomalous_clip(path, first_anomaly_frame, output_filename)

                if clip_path:
                    narration = get_gemini_video_narration(clip_path)
                    result["narration"] = narration
                    result["clip_url"] = f"/anomalous_clips/{output_filename}"
                    result["clip_path"] = clip_path
                else:
                    result["narration"] = result.get("narration") or "Failed to extract anomalous clip"
                    result["clip_url"] = None
            except Exception as e:
                result["narration"] = f"Error generating narration: {str(e)}"
                result["clip_url"] = None

        if "error" not in result:
            result["run_id"] = store.record_run(
                kind="detect",
                filename=filename,
                status=result.get("status", "complete"),
                total_frames=result.get("total_frames", 0),
                anomaly_count=result.get("anomaly_count", 0),
                threshold=result.get("threshold"),
                max_score=result.get("max_score"),
                mean_score=result.get("mean_score"),
                calibrated=1 if result.get("calibrated") else 0,
                narration=result.get("narration"),
                clip_url=result.get("clip_url"),
                scores_json=json.dumps(result.get("scores", [])),
            )

        return jsonify(result)

    return jsonify({"error": "Invalid mode"}), 400

@app.route("/narrate", methods=["POST"])
def narrate_anomalies():
    
    try:
        data = request.get_json(silent=True) or {}
        anomaly_frames = data.get("anomaly_frames", [])
        output_filename = safe_output_name(
            data.get("output_filename"), fallback_stem="anomalous_clip"
        )

        # Confined to the uploads directory: without this, any readable file on
        # the server could be sent to the narration API.
        video_path = resolve_uploaded_video(data.get("video_path"))
        if not video_path:
            return jsonify({"error": "Video file not found"}), 400

        if anomaly_frames:
            first_anomaly_frame = int(anomaly_frames[0])
            clip_path = extract_anomalous_clip(video_path, first_anomaly_frame, output_filename)
            
            if not clip_path:
                return jsonify({"error": "Failed to extract anomalous clip"}), 500
            
            # Generate narration for the clip
            narration = get_gemini_video_narration(clip_path)
            
            return jsonify({
                "narration": narration,
                "clip_url": f"/anomalous_clips/{output_filename}",
                "clip_path": clip_path
            }), 200
        else:
            return jsonify({"error": "No anomaly frames provided"}), 400
            
    except Exception as e:
        return jsonify({"error": f"Narration generation failed: {str(e)}"}), 500

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$")

@app.route("/contact", methods=["POST"])
def contact():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    name = (data.get("name") or "").strip()
    company = (data.get("company") or "").strip()
    message = (data.get("message") or "").strip()

    if not EMAIL_RE.match(email):
        return jsonify({"error": "Please provide a valid email address."}), 400
    if not message:
        return jsonify({"error": "Please include a message."}), 400

    # Cap stored lengths so a large paste cannot bloat the database
    contact_id = store.record_contact(
        name[:120], email[:200], company[:120], message[:4000]
    )
    return jsonify({"id": contact_id, "message": "Thanks — we'll be in touch."}), 201

@app.route("/train/status/<job_id>", methods=["GET"])
def train_status(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Unknown or expired job"}), 404

    if job["state"] == "complete" and not job.get("recorded"):
        # Persist the finished run once, so it appears in the dashboard.
        calibration = job.get("calibration") or {}
        store.record_run(
            kind="train",
            filename=job.get("filename", "unknown"),
            status="complete",
            total_frames=calibration.get("frames", 0),
            threshold=calibration.get("threshold"),
            calibrated=1,
        )
        job["recorded"] = True

    return jsonify(job)

@app.route("/runs", methods=["GET"])
def list_runs():
    limit = request.args.get("limit", default=20, type=int)
    return jsonify({"runs": store.list_runs(limit=max(1, min(limit, 100)))})

@app.route("/runs/<int:run_id>", methods=["GET"])
def get_run(run_id):
    run = store.get_run(run_id)
    if not run:
        return jsonify({"error": "Run not found"}), 404
    return jsonify(run)

@app.route("/stats", methods=["GET"])
def stats():
    payload = store.get_stats()

    # Whether a calibrated baseline exists drives the dashboard's model tile.
    from models.detect_anomaly import get_autoencoder, load_calibration
    _, model_path = get_autoencoder()
    calibration = load_calibration(model_path) if model_path else None
    payload["model"] = {
        "trained": bool(model_path),
        "calibrated": bool(calibration),
        "threshold": calibration.get("threshold") if calibration else None,
        "trained_at": calibration.get("trained_at") if calibration else None,
        "frames": calibration.get("frames") if calibration else None,
    }
    return jsonify(payload)

@app.route("/live/start", methods=["POST"])
def live_start():
    session_id = start_session()
    return jsonify({"session_id": session_id})

@app.route("/live/frame", methods=["POST"])
def live_frame():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    image = data.get("image")

    if not session_id or not image:
        return jsonify({"error": "Missing session_id or image"}), 400

    result = score_frame(session_id, image)
    return jsonify(result), (400 if "error" in result else 200)

@app.route("/live/narrate", methods=["POST"])
def live_narrate():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")

    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400

    result = narrate_session(session_id, ANOMALOUS_CLIPS_FOLDER)
    if "error" not in result:
        status = 200
    elif result["error"] == "cooldown":
        status = 429
    else:
        status = 400
    return jsonify(result), status

@app.route("/live/stop", methods=["POST"])
def live_stop():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    if session_id:
        stop_session(session_id)
    return jsonify({"status": "stopped"})

@app.route("/anomalous_clips/<filename>", methods=["GET"])
def serve_anomalous_clip(filename):
    
    try:
        print(f"Serving anomalous clip: {filename}")
        return send_from_directory(ANOMALOUS_CLIPS_FOLDER, filename)
    except Exception as e:
        return jsonify({"error": f"Failed to serve clip: {str(e)}"}), 404

def extract_anomalous_clip(video_path, first_anomaly_frame, output_filename,
                          context_sec_before=1.5, clip_duration_sec=6.0):
    """
    Extract a short clip around the first anomaly frame using the source video's FPS
    and frame bounds so playback and length are correct.
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Cannot open video {video_path}")
            return None

        # Use source video properties so the clip plays correctly
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        if total_frames <= 0:
            cap.release()
            return None

        # Clip range: include some context before the anomaly, then clip_duration_sec after
        frames_before = int(context_sec_before * fps)
        frames_after = int(clip_duration_sec * fps)
        start_frame = max(0, first_anomaly_frame - frames_before)
        end_frame = min(total_frames, first_anomaly_frame + frames_after)
        if start_frame >= end_frame:
            cap.release()
            return None

        output_path = os.path.join(ANOMALOUS_CLIPS_FOLDER, output_filename)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
        if not out.isOpened():
            print(f"Error: Cannot create video writer for {output_path}")
            cap.release()
            return None

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        num_frames = end_frame - start_frame
        frame_count = 0
        while frame_count < num_frames:
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)
            frame_count += 1

        cap.release()
        out.release()

        if frame_count == 0:
            if os.path.exists(output_path):
                os.remove(output_path)
            return None

        # Re-encode to H.264 so browsers can play the clip (OpenCV mp4v is often not playable)
        reencode_mp4_to_h264(output_path)

        print(f"Anomalous clip extracted: {output_path} ({frame_count} frames @ {fps:.1f} fps)")
        return output_path
    except Exception as e:
        print(f"Error extracting clip: {str(e)}")
        return None

if __name__ == "__main__":
    # Run on port 5001 to match Docker and docker-compose.yml.
    # debug is opt-in: the Werkzeug debugger allows remote code execution,
    # so it must never default to on while binding 0.0.0.0.
    debug = os.getenv("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    app.run(debug=debug, host="0.0.0.0", port=5001, threaded=True)
