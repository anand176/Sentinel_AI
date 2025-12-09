# Backend Flow Documentation

## Overview
The Sentinel AI backend is a unified Flask application running on **port 5000** that handles video anomaly detection and narration generation in a single integrated pipeline.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Flask Backend (Port 5000)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ POST /upload                                         │  │
│  │ - Receives video file                               │  │
│  │ - Saves to uploads/uploaded_videos/                 │  │
│  │ - Returns video path                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Anomaly Detection (detect_anomaly.py)               │  │
│  │ - Loads pre-trained autoencoder model               │  │
│  │ - Extracts frames from video                        │  │
│  │ - Detects anomalous frames                          │  │
│  │ - Returns list of anomalous frame indices           │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ POST /narrate                                        │  │
│  │ - Receives video path + anomaly frames              │  │
│  │ - Extracts 300-frame clip from first anomaly        │  │
│  │ - Saves to uploads/anomalous_clips/                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Narration Generation (narration_client.py)          │  │
│  │ - Uploads clip to Google Gemini API                 │  │
│  │ - Generates single-sentence narration               │  │
│  │ - Returns narration text                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ GET /anomalous_clips/<filename>                      │  │
│  │ - Serves extracted anomalous clip video             │  │
│  │ - Frontend plays video alongside narration          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Endpoint Flow

### 1. **POST /upload** - Upload Video
**Purpose**: Upload a video file for either training the model or detecting anomalies

**Request**:
```json
{
  "video": <binary file>,
  "mode": "train" | "detect"
}
```

**What Happens**:
1. Receives video file from frontend
2. Saves to `uploads/uploaded_videos/`
3. Routes to appropriate handler based on mode

---

#### **Mode: "train"** - Train Autoencoder Model

**Request**:
```json
{
  "video": <binary file>,
  "mode": "train"
}
```

**Response**:
```json
{
  "message": "Model trained successfully",
  "model_path": "models/autoencoder_video_complex.h5"
}
```

**What Happens**:
1. Receives normal/baseline video (no anomalies)
2. Saves video to `uploads/uploaded_videos/`
3. Calls `train_model()` from `models/train_autoencoder.py`
4. Autoencoder learns normal patterns from the video
5. Saves trained model to `models/autoencoder_video_complex.h5`
6. Model is now ready for anomaly detection

**Use Case**:
- Initial setup with baseline/normal video
- Retraining when detection accuracy needs improvement
- Adapting model to new environments or camera angles

---

#### **Mode: "detect"** - Detect Anomalies

**Request**:
```json
{
  "video": <binary file>,
  "mode": "detect"
}
```

**Response**:
```json
{
  "message": "Video processed",
  "anomalies": [45, 67, 89, 102, ...],
  "video_path": "uploads/uploaded_videos/video.mp4"
}
```

**What Happens**:
1. Receives video file from frontend
2. Saves to `uploads/uploaded_videos/`
3. Calls `detect_anomalies()` from `models/detect_anomaly.py`
4. Loads pre-trained autoencoder model
5. Extracts frames from video
6. Compares each frame's reconstruction error to threshold
7. Returns list of anomalous frame indices
8. Frontend can then call `/narrate` with these indices

**Use Case**:
- Real-time surveillance monitoring
- Post-event video analysis
- Batch processing of recorded videos

---

### 2. **POST /narrate** - Generate Narration
**Purpose**: Extract anomalous clip and generate narration

**Request**:
```json
{
  "video_path": "uploads/uploaded_videos/video.mp4",
  "anomaly_frames": [45, 67, 89],
  "fps": 30,
  "output_filename": "anomalous_clip.mp4"
}
```

**Response**:
```json
{
  "narration": "Unusual movement detected in the video",
  "clip_url": "/anomalous_clips/anomalous_clip.mp4",
  "clip_path": "uploads/anomalous_clips/anomalous_clip.mp4"
}
```

**What Happens**:
1. Extracts first anomalous frame index (e.g., 45)
2. Extracts 300 frames starting from frame 45 (frames 45-344)
3. Saves extracted clip to `uploads/anomalous_clips/`
4. Uploads clip to Google Gemini API
5. Generates single-sentence narration describing the anomaly
6. Returns narration + clip URL

---

### 3. **GET /anomalous_clips/<filename>** - Serve Clip
**Purpose**: Stream the extracted anomalous clip video

**Request**:
```
GET /anomalous_clips/anomalous_clip.mp4
```

**Response**: Binary video file (MP4)

**What Happens**:
1. Receives filename from URL
2. Serves video from `uploads/anomalous_clips/`
3. Frontend plays video in player

---

## Train vs Detect Modes - Comparison

| Aspect | Train Mode | Detect Mode |
|--------|-----------|------------|
| **Purpose** | Build/update the autoencoder model | Find anomalies in videos |
| **Input Video** | Normal/baseline video (no anomalies) | Any video (may contain anomalies) |
| **Processing** | Learns normal patterns | Compares against learned patterns |
| **Output** | Trained model file (.h5) | List of anomalous frame indices |
| **Duration** | Longer (depends on video length) | Moderate (depends on video length) |
| **Frequency** | Once during setup, then occasionally | Every time you want to analyze a video |
| **Next Step** | Ready for detection | Call `/narrate` endpoint |
| **Example Use** | Upload 5 min normal surveillance video | Upload suspicious video to find anomalies |

---

## Typical Workflow

### **Initial Setup (One-time)**
```
1. Collect baseline/normal video (5-10 minutes)
2. POST /upload with mode="train"
3. Backend trains autoencoder model
4. Model saved to models/autoencoder_video_complex.h5
5. System ready for anomaly detection
```

### **Anomaly Detection (Recurring)**
```
1. User uploads suspicious video
2. POST /upload with mode="detect"
3. Backend detects anomalies → returns frame indices
4. Frontend displays detected anomalies
5. User clicks on anomaly
6. POST /narrate with anomaly frame index
7. Backend extracts 300-frame clip + generates narration
8. Frontend displays narration + plays clip
```

---

## Data Flow Example

### Step 1: User uploads video
```
Frontend → POST /upload → Backend saves video → Returns anomaly frames
```

### Step 2: Frontend gets anomalies
```
Frontend receives: [45, 67, 89, 102, ...]
Frontend calls: POST /narrate with first anomaly (45)
```

### Step 3: Backend extracts and narrates
```
Backend extracts frames 45-344 (300 frames)
Saves to: uploads/anomalous_clips/anomalous_clip.mp4
Uploads to Gemini API
Receives narration: "Unusual movement detected..."
Returns: narration + clip URL
```

### Step 4: Frontend displays results
```
Frontend displays narration text
Frontend plays video from: GET /anomalous_clips/anomalous_clip.mp4
```

---

## File Structure

```
Backend/
├── app.py                          # Main Flask application
│   ├── POST /upload               # Upload & detect anomalies
│   ├── POST /narrate              # Extract clip & generate narration
│   ├── GET /anomalous_clips/<fn>  # Serve anomalous clips
│   └── extract_anomalous_clip()   # Helper function
│
├── models/
│   ├── detect_anomaly.py          # Anomaly detection logic
│   └── train_autoencoder.py       # Model training
│
├── utils/
│   ├── narration_client.py        # Gemini API integration
│   │   ├── get_gemini_video_narration()
│   │   └── call_narration_api()
│   └── extract_frames.py          # Frame extraction utilities
│
├── uploads/
│   ├── uploaded_videos/           # Original uploaded videos
│   └── anomalous_clips/           # Extracted anomalous clips
│
├── requirements.txt               # Python dependencies
└── Dockerfile                     # Docker configuration
```

---

## Key Components

### **Anomaly Detection** (`models/detect_anomaly.py`)
- Loads pre-trained autoencoder model (`autoencoder_video_complex.h5`)
- Extracts frames from video
- Compares reconstruction error to detect anomalies
- Returns list of anomalous frame indices

### **Narration Generation** (`utils/narration_client.py`)
- Integrates with Google Gemini 1.5 Flash API
- Uploads video clip to Gemini
- Generates single-sentence narration
- Cleans up uploaded file

### **Clip Extraction** (`app.py`)
- Uses OpenCV (cv2) to read video
- Extracts specified frame range
- Writes to MP4 format
- Preserves original video properties (resolution, FPS)

---

## Environment Setup

Create a `.env` file in the `Backend/` directory:

```
GEMINI_API_KEY=your_api_key_here
```

Required files:
- `Backend/autoencoder_video_complex.h5` - Pre-trained model

---

## Processing Timeline

```
User uploads video (1-2 seconds)
    ↓
Anomaly detection (depends on video length, ~10-30 seconds)
    ↓
User requests narration for first anomaly
    ↓
Extract 300-frame clip (1-2 seconds)
    ↓
Upload to Gemini API (2-3 seconds)
    ↓
Generate narration (3-5 seconds)
    ↓
Return narration + clip URL (instant)
    ↓
Frontend plays video + displays narration
```

---

## Error Handling

| Endpoint | Error | Response |
|----------|-------|----------|
| `/upload` | Missing video or mode | 400 - Missing video or mode |
| `/narrate` | Video file not found | 400 - Video file not found |
| `/narrate` | No anomaly frames | 400 - No anomaly frames provided |
| `/narrate` | Clip extraction failed | 500 - Failed to extract anomalous clip |
| `/narrate` | Gemini API error | 500 - Narration generation failed |
| `/anomalous_clips/<fn>` | File not found | 404 - Failed to serve clip |

---

## Summary

The backend provides a **single unified pipeline**:
1. **Upload** → Detect anomalies
2. **Narrate** → Extract clip + Generate narration
3. **Serve** → Stream clip to frontend

All on **port 5000** with integrated Gemini API for intelligent narration generation.
