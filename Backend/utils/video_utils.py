import os
import subprocess


def reencode_mp4_to_h264(input_path):
    """Re-encode MP4 to H.264 so browsers can play it (OpenCV mp4v often does not)."""
    if not os.path.isfile(input_path):
        return False
    tmp_path = input_path + ".h264.mp4"
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", input_path,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            tmp_path
        ], check=True, capture_output=True, timeout=120)
        os.replace(tmp_path, input_path)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        print(f"Re-encode to H.264 skipped or failed: {e}")
        return False
