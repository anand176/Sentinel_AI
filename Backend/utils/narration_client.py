import requests

def call_narration_api(video_path, anomalies):
    # Placeholder for your narration endpoint
    url = "http://localhost:5001/narrate"  # Example endpoint
    payload = {
        "video_path": video_path,
        "anomaly_frames": anomalies[:5].tolist() if len(anomalies) > 5 else anomalies.tolist()
    }

    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            return response.json().get("narration", "No narration returned")
        else:
            return "Narration service error"
    except Exception as e:
        return f"Failed to connect to narration service: {e}"
