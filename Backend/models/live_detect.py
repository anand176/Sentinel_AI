import base64
import os
import time
import uuid
from collections import deque
from threading import Lock

import cv2
import numpy as np

from models.detect_anomaly import get_autoencoder
from utils.narration_client import get_gemini_video_narration
from utils.video_utils import reencode_mp4_to_h264

FRAME_SIZE = (128, 128)
SCORE_BUFFER_LEN = 60       # sampled frames used to calibrate the rolling anomaly threshold
WARMUP_FRAMES = 15          # frames needed before the threshold is trusted
CLIP_BUFFER_LEN = 45        # raw frames kept in memory to build an anomaly clip
NARRATION_COOLDOWN_SEC = 15  # minimum gap between narration calls per session

_sessions = {}
_sessions_lock = Lock()


class LiveSession:
    def __init__(self):
        self.scores = deque(maxlen=SCORE_BUFFER_LEN)
        self.raw_frames = deque(maxlen=CLIP_BUFFER_LEN)
        self.fps_estimate = 2.0
        self.last_narration_time = 0.0
        self.lock = Lock()


def start_session():
    session_id = uuid.uuid4().hex
    with _sessions_lock:
        _sessions[session_id] = LiveSession()
    return session_id


def stop_session(session_id):
    with _sessions_lock:
        _sessions.pop(session_id, None)


def _get_session(session_id):
    with _sessions_lock:
        return _sessions.get(session_id)


def _decode_frame(image_b64):
    b64 = image_b64.split(",", 1)[-1]
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def score_frame(session_id, image_b64):
    session = _get_session(session_id)
    if session is None:
        return {"error": "Unknown or expired session. Call /live/start first."}

    model, _ = get_autoencoder()
    if model is None:
        return {"error": "No trained model found. Please train first."}

    frame = _decode_frame(image_b64)
    if frame is None:
        return {"error": "Could not decode frame"}

    resized = cv2.resize(frame, FRAME_SIZE)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    normalized = gray.astype("float32") / 255.0
    model_input = np.expand_dims(normalized, axis=(0, -1))

    reconstructed = model.predict(model_input, verbose=0)
    mse = float(np.mean(np.power(model_input - reconstructed, 2)))

    with session.lock:
        session.raw_frames.append(frame)
        ready = len(session.scores) >= WARMUP_FRAMES
        threshold = float(np.mean(session.scores) + 2 * np.std(session.scores)) if ready else None
        is_anomaly = bool(ready and mse > threshold)
        session.scores.append(mse)

    return {
        "mse": mse,
        "threshold": threshold,
        "is_anomaly": is_anomaly,
        "calibrating": not ready,
    }


def narrate_session(session_id, output_dir):
    session = _get_session(session_id)
    if session is None:
        return {"error": "Unknown or expired session."}

    now = time.time()
    with session.lock:
        elapsed = now - session.last_narration_time
        if elapsed < NARRATION_COOLDOWN_SEC:
            return {"error": "cooldown", "retry_after": NARRATION_COOLDOWN_SEC - elapsed}
        if len(session.raw_frames) < 5:
            return {"error": "Not enough buffered frames yet"}
        frames = list(session.raw_frames)
        fps = session.fps_estimate
        session.last_narration_time = now

    output_filename = f"live_clip_{session_id}_{int(now)}.mp4"
    clip_path = _write_clip(frames, output_dir, output_filename, fps=fps)
    if not clip_path:
        return {"error": "Failed to build clip from live buffer"}

    reencode_mp4_to_h264(clip_path)
    narration = get_gemini_video_narration(clip_path)

    return {
        "narration": narration,
        "clip_url": f"/anomalous_clips/{output_filename}",
    }


def _write_clip(frames, output_dir, output_filename, fps=2.0):
    if not frames:
        return None
    height, width = frames[0].shape[:2]
    output_path = os.path.join(output_dir, output_filename)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, max(fps, 1.0), (width, height))
    if not out.isOpened():
        return None
    for frame in frames:
        out.write(frame)
    out.release()
    return output_path
