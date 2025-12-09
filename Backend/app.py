from flask import Flask, request, jsonify, send_from_directory
from models.train_autoencoder import train_model
from models.detect_anomaly import detect_anomalies
from utils.narration_client import get_gemini_video_narration
import os
import cv2
import numpy as np

app = Flask(__name__)
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
        return jsonify(result)

    return jsonify({"error": "Invalid mode"}), 400

@app.route("/narrate", methods=["POST"])
def narrate_anomalies():
    """
    Generate narration for anomalous clips.
    
    Expects JSON payload:
    {
        "video_path": "path/to/video.mp4",
        "anomaly_frames": [frame_indices],
        "fps": 30,
        "output_filename": "anomalous_clip.mp4"
    }
    """
    try:
        data = request.get_json()
        video_path = data.get("video_path")
        anomaly_frames = data.get("anomaly_frames", [])
        fps = data.get("fps", 30)
        output_filename = data.get("output_filename", "anomalous_clip.mp4")
        
        if not video_path or not os.path.exists(video_path):
            return jsonify({"error": "Video file not found"}), 400
        
        # Extract anomalous clip (first 300 frames from first anomalous frame)
        if anomaly_frames:
            start_frame = int(anomaly_frames[0])
            end_frame = min(start_frame + 300, start_frame + 300)
            
            clip_path = extract_anomalous_clip(video_path, start_frame, end_frame, fps, output_filename)
            
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
    """
    Serve anomalous clip video files.
    """
    try:
        print(f"Serving anomalous clip: {filename}")
        return send_from_directory(ANOMALOUS_CLIPS_FOLDER, filename)
    except Exception as e:
        return jsonify({"error": f"Failed to serve clip: {str(e)}"}), 404

def extract_anomalous_clip(video_path, start_frame, end_frame, fps, output_filename):
    """
    Extract a clip from a video containing anomalous frames.
    
    Args:
        video_path: Path to the original video
        start_frame: Starting frame index
        end_frame: Ending frame index
        fps: Frames per second
        output_filename: Name for the output clip file
        
    Returns:
        Path to the extracted clip or None if failed
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"Error: Cannot open video {video_path}")
            return None
        
        # Get video properties
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Create video writer
        output_path = os.path.join(ANOMALOUS_CLIPS_FOLDER, output_filename)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
        
        if not out.isOpened():
            print(f"Error: Cannot create video writer for {output_path}")
            cap.release()
            return None
        
        # Extract frames
        frame_count = 0
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        while frame_count < (end_frame - start_frame):
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)
            frame_count += 1
        
        cap.release()
        out.release()
        
        print(f"Anomalous clip extracted: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"Error extracting clip: {str(e)}")
        return None

if __name__ == "__main__":
    app.run(debug=True, port=5000)
