from flask import Flask, request, jsonify
from models.train_autoencoder import train_model
from models.detect_anomaly import detect_anomalies
import os

app = Flask(__name__)
UPLOAD_FOLDER = "uploads/uploaded_videos"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

if __name__ == "__main__":
    app.run(debug=True, port=5000)
