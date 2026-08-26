"""
Pure helpers for turning per-frame error scores into something a chart and a
reviewer can use. Kept free of TensorFlow imports so they stay independently
testable.
"""

import numpy as np

CHART_POINTS = 600   # series length sent to the client
MIN_SEGMENT_GAP = 8  # frames; closer anomalies merge into one segment


def downsample(values, target=CHART_POINTS):
    """
    Reduce a score series for transport using MAX pooling, not mean.

    Anomalies are brief spikes. Averaging each bucket would flatten exactly the
    features the chart exists to show, so the peak of each bucket is kept along
    with its true frame index.
    """
    n = len(values)
    if n == 0:
        return []
    if n <= target:
        return [{"i": i, "v": float(v)} for i, v in enumerate(values)]

    bucket = n / target
    out = []
    for b in range(target):
        start = int(b * bucket)
        end = max(start + 1, int((b + 1) * bucket))
        window = values[start:end]
        peak = int(np.argmax(window))
        out.append({"i": start + peak, "v": float(window[peak])})
    return out


def group_segments(indices, fps, gap=MIN_SEGMENT_GAP):
    """Collapse runs of consecutive anomalous frames into labelled segments."""
    indices = [int(i) for i in indices]
    if not indices:
        return []

    segments = []
    start = prev = indices[0]
    for idx in indices[1:]:
        if idx - prev <= gap:
            prev = idx
            continue
        segments.append((start, prev))
        start = prev = idx
    segments.append((start, prev))

    return [
        {
            "start_frame": s,
            "end_frame": e,
            "start_sec": round(s / fps, 2) if fps else None,
            "end_sec": round(e / fps, 2) if fps else None,
            "frames": e - s + 1,
        }
        for s, e in segments
    ]
