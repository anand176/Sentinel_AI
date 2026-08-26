import json
import os

import cv2
import numpy as np
from keras.models import load_model

from models.train_autoencoder import calibration_path
from utils.extract_frames import extract_frames
from utils.series import downsample, group_segments

_autoencoder_cache = {"model": None, "path": None}


def get_autoencoder():
    """Load and cache the trained autoencoder so repeated calls (e.g. live frames) are fast."""
    model_path = "models/saved_models/autoencoder_video1.h5"
    if not os.path.exists(model_path):
        model_path = "models/saved_models/autoencoder_video_complex.h5"
    if not os.path.exists(model_path):
        return None, None

    if _autoencoder_cache["path"] != model_path:
        _autoencoder_cache["model"] = load_model(model_path)
        _autoencoder_cache["path"] = model_path

    return _autoencoder_cache["model"], model_path


def load_calibration(model_path):
    """Baseline error distribution recorded at training time, if any."""
    path = calibration_path(model_path)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _video_fps(video_path):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) if cap.isOpened() else 0
    cap.release()
    return fps or 30.0


def detect_anomalies(video_path, sigma=None):
    autoencoder, model_path = get_autoencoder()
    if autoencoder is None:
        return {"error": "No trained model found. Please train first.", "status": "Error"}

    frames = extract_frames(video_path)
    if len(frames) == 0:
        return {"error": "Could not read any frames from this video.", "status": "Error"}

    reconstructed = autoencoder.predict(frames, verbose=0)
    mse = np.mean(np.power(frames - reconstructed, 2), axis=(1, 2, 3))

    calibration = load_calibration(model_path)
    if calibration:
        # Threshold comes from the TRAINING baseline, so an ordinary video can
        # legitimately produce zero anomalies.
        effective_sigma = sigma if sigma is not None else calibration.get("sigma", 2.0)
        threshold = calibration["mean"] + effective_sigma * calibration["std"]
        calibrated = True
    else:
        # Fallback for models trained before calibration existed. Self-referential:
        # it always flags roughly a fixed share of frames, so it cannot report "clean".
        effective_sigma = sigma if sigma is not None else 2.0
        threshold = float(np.mean(mse) + effective_sigma * np.std(mse))
        calibrated = False

    anomalies = np.where(mse > threshold)[0]
    fps = _video_fps(video_path)

    result = {
        "status": "Anomaly Detected" if len(anomalies) else "No anomalies detected",
        "frames_with_anomaly": anomalies.tolist(),
        "anomaly_count": int(len(anomalies)),
        "total_frames": int(len(mse)),
        "threshold": float(threshold),
        "sigma": float(effective_sigma),
        "calibrated": calibrated,
        "max_score": float(np.max(mse)),
        "mean_score": float(np.mean(mse)),
        "fps": float(fps),
        "duration_sec": round(len(mse) / fps, 2) if fps else None,
        "scores": downsample(mse),
        "segments": group_segments(anomalies, fps),
    }

    if not calibrated:
        result["warning"] = (
            "This model has no saved baseline, so the threshold was derived from "
            "the video being tested — it will flag frames even in normal footage. "
            "Retrain to calibrate."
        )

    return result
