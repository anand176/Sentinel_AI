from google import genai
from google.genai.types import FileState
from dotenv import load_dotenv
import os
import time

load_dotenv()
_client = None

def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client

def _wait_for_file_active(client, file_name, max_wait_seconds=120, poll_interval=3):
    """Poll until the uploaded file is in ACTIVE state; required before generate_content."""
    deadline = time.monotonic() + max_wait_seconds
    while time.monotonic() < deadline:
        f = client.files.get(name=file_name)
        state = getattr(f, "state", None)
        if state == FileState.ACTIVE:
            return
        if state == FileState.FAILED:
            err = getattr(f, "error", None) or "Unknown"
            raise RuntimeError(f"File processing failed: {err}")
        if state not in (FileState.PROCESSING, FileState.STATE_UNSPECIFIED, None):
            raise RuntimeError(f"File not usable: state={state}")
        time.sleep(poll_interval)
    raise RuntimeError("File did not become ACTIVE in time")

def get_gemini_video_narration(video_path):
    """
    Generate narration for a video using Google Gemini API.

    Args:
        video_path: Path to the video file

    Returns:
        Narration text describing the anomaly in the video
    """
    try:
        client = _get_client()
        video_file = client.files.upload(file=video_path)
        _wait_for_file_active(client, video_file.name)
        prompt = "Describe the possible anomaly in this video in a single sentence"
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, video_file],
        )
        try:
            client.files.delete(name=video_file.name)
        except Exception:
            pass
        if hasattr(response, "text") and response.text:
            return response.text
        if response.candidates and response.candidates[0].content.parts:
            return response.candidates[0].content.parts[0].text
        return "No narration generated."
    except Exception as e:
        return f"Error generating narration: {str(e)}"

def call_narration_api(video_path, anomalies):
    """
    Generate narration for detected anomalies in a video.

    Args:
        video_path: Path to the video file
        anomalies: Array of anomalous frame indices

    Returns:
        Narration text describing the anomalies
    """
    return get_gemini_video_narration(video_path)
