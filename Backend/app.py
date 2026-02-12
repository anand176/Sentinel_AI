from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models.train_autoencoder import train_model
from models.detect_anomaly import detect_anomalies
from utils.narration_client import get_gemini_video_narration
import os
import subprocess
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS so the React frontend can call this API
UPLOAD_FOLDER = "uploads/uploaded_videos"
ANOMALOUS_CLIPS_FOLDER = "uploads/anomalous_clips"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ANOMALOUS_CLIPS_FOLDER, exist_ok=True)

@app.route("/upload", methods=["POST"])
def handle_upload():
    video = request.files.get("video")
    mode = request.form.get("mode")

    if not video or not mode:
        return jsonify({"error": "Missing video or mode"}), 400

    path = os.path.join(UPLOAD_FOLDER, video.filename)
    video.save(path)

    if mode == "train":
        model_path = train_model(path)
        return jsonify({"message": "Model trained successfully", "model_path": model_path})

    elif mode == "detect":
        result = detect_anomalies(path)
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

        return jsonify(result)

    return jsonify({"error": "Invalid mode"}), 400

@app.route("/narrate", methods=["POST"])
def narrate_anomalies():
    
    try:
        data = request.get_json()
        video_path = data.get("video_path")
        anomaly_frames = data.get("anomaly_frames", [])
        fps = data.get("fps", 30)
        output_filename = data.get("output_filename", "anomalous_clip.mp4")
        
        if not video_path or not os.path.exists(video_path):
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

@app.route("/anomalous_clips/<filename>", methods=["GET"])
def serve_anomalous_clip(filename):
    
    try:
        print(f"Serving anomalous clip: {filename}")
        return send_from_directory(ANOMALOUS_CLIPS_FOLDER, filename)
    except Exception as e:
        return jsonify({"error": f"Failed to serve clip: {str(e)}"}), 404

def _reencode_mp4_to_h264(input_path):
    """Re-encode MP4 to H.264 so browsers can play it (OpenCV mp4v often does not)."""
    if not os.path.isfile(input_path):
        return False
    tmp_path = input_path + ".h264.mp4"
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", input_path,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            tmp_path
        ], check=True, capture_output=True, timeout=120)
        os.replace(tmp_path, input_path)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        print(f"Re-encode to H.264 skipped or failed: {e}")
        return False

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
        _reencode_mp4_to_h264(output_path)

        print(f"Anomalous clip extracted: {output_path} ({frame_count} frames @ {fps:.1f} fps)")
        return output_path
    except Exception as e:
        print(f"Error extracting clip: {str(e)}")
        return None

if __name__ == "__main__":
    # Run on port 5001 to match Docker and docker-compose.yml
    app.run(debug=True, host="0.0.0.0", port=5001)
