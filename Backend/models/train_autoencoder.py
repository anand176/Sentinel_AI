import json
import os
import time

import numpy as np
from keras.callbacks import Callback
from keras.layers import Input, Conv2D, MaxPooling2D, UpSampling2D
from keras.models import Model
from sklearn.model_selection import train_test_split

from utils.extract_frames import extract_frames

MODEL_DIR = "models/saved_models"
MODEL_NAME = "autoencoder_video1.h5"
DEFAULT_SIGMA = 2.0


def calibration_path(model_path):
    """Sidecar holding the baseline error distribution for a given model."""
    return os.path.splitext(model_path)[0] + ".calibration.json"


class _ProgressCallback(Callback):
    """Reports epoch progress back to the caller as a 0-100 percentage."""

    def __init__(self, total_epochs, on_progress):
        super().__init__()
        self.total_epochs = total_epochs
        self.on_progress = on_progress

    def on_epoch_end(self, epoch, logs=None):
        if not self.on_progress:
            return
        # Training occupies 10-90% of the job; extraction and calibration
        # take the bands on either side.
        pct = 10 + int(((epoch + 1) / self.total_epochs) * 80)
        loss = (logs or {}).get("loss")
        self.on_progress(pct, f"Epoch {epoch + 1}/{self.total_epochs}", loss)


def build_autoencoder():
    input_img = Input(shape=(128, 128, 1))

    # Encoder
    x = Conv2D(32, (3, 3), activation='relu', padding='same')(input_img)
    x = MaxPooling2D((2, 2), padding='same')(x)
    x = Conv2D(32, (3, 3), activation='relu', padding='same')(x)
    x = MaxPooling2D((2, 2), padding='same')(x)

    # Decoder
    x = Conv2D(32, (3, 3), activation='relu', padding='same')(x)
    x = UpSampling2D((2, 2))(x)
    x = Conv2D(32, (3, 3), activation='relu', padding='same')(x)
    x = UpSampling2D((2, 2))(x)
    decoded = Conv2D(1, (3, 3), activation='sigmoid', padding='same')(x)

    autoencoder = Model(input_img, decoded)
    autoencoder.compile(optimizer='adam', loss='binary_crossentropy')
    return autoencoder


def train_model(video_path, epochs=20, on_progress=None, sigma=DEFAULT_SIGMA):
    """
    Train the autoencoder on baseline footage and record the reconstruction-error
    distribution it produces on that footage.

    Saving that distribution is the important part: detection compares against
    THIS baseline. Deriving a threshold from the video being tested instead
    guarantees that a fixed share of frames is always flagged, however ordinary
    the footage is.
    """
    if on_progress:
        on_progress(2, "Extracting frames", None)

    frames = extract_frames(video_path)
    if len(frames) < 8:
        raise ValueError(
            f"Need at least 8 frames to train, got {len(frames)}. Use a longer video."
        )

    X_train, X_test = train_test_split(frames, test_size=0.2, random_state=42)

    if on_progress:
        on_progress(10, f"Training on {len(X_train)} frames", None)

    autoencoder = build_autoencoder()
    autoencoder.fit(
        X_train, X_train,
        epochs=epochs,
        batch_size=32,
        validation_data=(X_test, X_test),
        verbose=0,
        callbacks=[_ProgressCallback(epochs, on_progress)],
    )

    if on_progress:
        on_progress(92, "Calibrating baseline", None)

    # Baseline error distribution over the training footage
    reconstructed = autoencoder.predict(frames, verbose=0)
    mse = np.mean(np.power(frames - reconstructed, 2), axis=(1, 2, 3))
    mean, std = float(np.mean(mse)), float(np.std(mse))

    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, MODEL_NAME)
    autoencoder.save(model_path)

    calibration = {
        "mean": mean,
        "std": std,
        "sigma": sigma,
        "threshold": mean + sigma * std,
        "frames": int(len(frames)),
        "epochs": epochs,
        "source_video": os.path.basename(video_path),
        "trained_at": time.time(),
    }
    with open(calibration_path(model_path), "w", encoding="utf-8") as f:
        json.dump(calibration, f, indent=2)

    if on_progress:
        on_progress(100, "Complete", None)

    return {"model_path": model_path, "calibration": calibration}
