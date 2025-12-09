import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_gemini_video_narration(video_path):
    """
    Generate narration for a video using Google Gemini API.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Narration text describing the anomaly in the video
    """
    try:
        video_file = genai.upload_file(path=video_path)
        prompt = "Describe the possible anomaly in this video in a single sentence"
        model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")
        response = model.generate_content([prompt, video_file], request_options={"timeout": 600})
        genai.delete_file(video_file.name)
        return response.text
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
