"""
Background training jobs.

Training takes far longer than an HTTP request should, so /train starts a
worker thread and returns a job id the client polls. Job state lives in memory:
it is progress reporting, not a system of record — completed runs are persisted
by the caller.
"""

import threading
import time
import uuid

from models.train_autoencoder import train_model

JOB_TTL_SECONDS = 60 * 60  # finished jobs are reaped an hour after they end

_jobs = {}
_lock = threading.Lock()


def _reap_expired(now):
    """Drop finished jobs past their TTL. Caller must hold the lock."""
    for job_id, job in list(_jobs.items()):
        ended = job.get("ended_at")
        if ended and now - ended > JOB_TTL_SECONDS:
            del _jobs[job_id]


def start_training(video_path, filename, epochs=20, on_complete=None):
    job_id = uuid.uuid4().hex
    now = time.time()

    with _lock:
        _reap_expired(now)
        _jobs[job_id] = {
            "id": job_id,
            "filename": filename,
            "state": "running",
            "progress": 0,
            "stage": "Queued",
            "loss": None,
            "started_at": now,
            "ended_at": None,
            "error": None,
            "calibration": None,
        }

    def report(pct, stage, loss):
        with _lock:
            job = _jobs.get(job_id)
            if job:
                job["progress"] = pct
                job["stage"] = stage
                if loss is not None:
                    job["loss"] = float(loss)

    def run():
        try:
            result = train_model(video_path, epochs=epochs, on_progress=report)
            with _lock:
                job = _jobs.get(job_id)
                if job:
                    job.update(
                        state="complete",
                        progress=100,
                        stage="Complete",
                        ended_at=time.time(),
                        calibration=result["calibration"],
                    )
            if on_complete:
                on_complete(filename, result, None)
        except Exception as exc:  # surfaced to the client via job status
            with _lock:
                job = _jobs.get(job_id)
                if job:
                    job.update(
                        state="failed",
                        stage="Failed",
                        error=str(exc),
                        ended_at=time.time(),
                    )
            if on_complete:
                on_complete(filename, None, str(exc))

    threading.Thread(target=run, daemon=True).start()
    return job_id


def get_job(job_id):
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None
