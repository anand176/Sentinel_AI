import numpy as np
from keras.layers import Input, Conv2D, MaxPooling2D, UpSampling2D
from keras.models import Model
from sklearn.model_selection import train_test_split
from utils.extract_frames import extract_frames
import os

def train_model(video_path):
    frames = extract_frames(video_path)
    X_train, X_test = train_test_split(frames, test_size=0.2)

    input_img = Input(shape=(64, 64, 1))

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

    print("Training autoencoder...")
    autoencoder.fit(X_train, X_train, epochs=20, batch_size=32, validation_data=(X_test, X_test))

    model_dir = "models/saved_models"
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "autoencoder_video1.h5")
    autoencoder.save(model_path)
    print(f"Model saved at {model_path}")

    return model_path
