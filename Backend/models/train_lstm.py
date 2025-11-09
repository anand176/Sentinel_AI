import numpy as np
import pandas as pd
from keras.layers import LSTM, Dense, Dropout
from keras.models import Sequential
from sklearn.model_selection import train_test_split
import os

def train_lstm_model(file_paths):

    # Load and combine datasets
    dataframes = [pd.read_csv(path) for path in file_paths]
    anomaly_df = pd.concat(dataframes)
    
    # Prepare sequences
    X, y = [], []
    no_of_timesteps = 20
    datasets = anomaly_df.iloc[:, 1:].values
    n_samples = len(datasets)

    for i in range(no_of_timesteps, n_samples):
        X.append(datasets[i - no_of_timesteps:i, :])
        y.append(0)  # Label 0 for anomaly (you can change as needed)

    X, y = np.array(X), np.array(y)
    print(f"Data shape: {X.shape}, Labels: {y.shape}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(X.shape[1], X.shape[2])),
        Dropout(0.2),
        LSTM(50, return_sequences=True),
        Dropout(0.2),
        LSTM(50, return_sequences=True),
        Dropout(0.2),
        LSTM(50),
        Dropout(0.2),
        Dense(1, activation="sigmoid")
    ])

    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    print("Training LSTM model...")
    model.fit(X_train, y_train, epochs=50, batch_size=32, validation_data=(X_test, y_test))

    model_dir = "models/saved_models"
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "demo1.h5")
    model.save(model_path)
    print(f"LSTM model saved at {model_path}")

    return model_path


if __name__ == "__main__":
    paths = ["Anomaly.txt"]  
    train_lstm_model(paths)
