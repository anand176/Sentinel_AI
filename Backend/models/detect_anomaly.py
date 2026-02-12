import numpy as np
from keras.models import load_model
from utils.extract_frames import extract_frames
from utils.narration_client import call_narration_api
import os

def detect_anomalies(video_path):
    # Prefer trained model from train flow; fallback to existing complex model
    model_path = "models/saved_models/autoencoder_video1.h5"
    if not os.path.exists(model_path):
        model_path = "models/saved_models/autoencoder_video_complex.h5"
    if not os.path.exists(model_path):
        return {"error": "No trained model found. Please train first.", "status": "Error"}

    autoencoder = load_model(model_path)
    frames = extract_frames(video_path)

    reconstructed = autoencoder.predict(frames)
    mse = np.mean(np.power(frames - reconstructed, 2), axis=(1, 2, 3))

    threshold = np.mean(mse) + 2 * np.std(mse)
    anomalies = np.where(mse > threshold)[0]

    if len(anomalies) > 0:
        narration = call_narration_api(video_path, anomalies)
        return {
            "status": "Anomaly Detected",
            "frames_with_anomaly": anomalies.tolist(),
            "narration": narration
        }
    else:
        return {"status": "No anomalies detected"}
