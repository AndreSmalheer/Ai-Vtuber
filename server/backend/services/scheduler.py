from apscheduler.schedulers.asyncio import AsyncIOScheduler
scheduler = AsyncIOScheduler()
scheduler.start()

from datetime import datetime
from apscheduler.schedulers.base import STATE_RUNNING

def scheduler_add_job(func, trigger, run_date, kwargs=None):
    if not callable(func):
        raise ValueError("func must be callable")

    if scheduler.state != STATE_RUNNING:
        raise RuntimeError("Scheduler is not running")

    allowed_triggers = ["date", "interval", "cron"]
    if trigger not in allowed_triggers:
        raise ValueError(f"Invalid trigger: {trigger}")

    if kwargs is None:
        kwargs = {}

    if not isinstance(kwargs, dict):
        raise ValueError("kwargs must be a dictionary")

    if trigger == "date":
        if isinstance(run_date, str):
            try:
                run_date = datetime.strptime(run_date, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                raise ValueError("Invalid run_date format")

        if run_date < datetime.now():
            raise ValueError("run_date cannot be in the past")

    job = scheduler.add_job(
        func,
        trigger=trigger,
        run_date=run_date,
        kwargs=kwargs
    )

    return job

def scheduler_remove_job(job_id):
    try:
        scheduler.remove_job(job_id)
        return f"Job {job_id} removed successfully"
    except Exception as e:
        return f"Error removing job: {e}"

def edit_job(job_id, func=None, trigger=None, run_date=None, kwargs=None):
    job = scheduler_get_job(job_id)

    if job:
        scheduler_remove_job(job_id)

        if not func:
            func = job["func"]
        if not trigger:
            trigger = job["trigger"]
        if not run_date:
            run_date = job["run_date"]
        if not kwargs:
            kwargs = job["kwargs"]

        job = scheduler.add_job(
            func,
            trigger=trigger,
            run_date=run_date,
            kwargs=kwargs,
            id=job_id
        )

        return f"Job {job_id} edited successfully"
    else:
        return f"Job {job_id} not found"

def scheduler_get_jobs():
    jobs = scheduler.get_jobs()
    job_list = []
    for job in jobs:
        job_list.append({
            "id": job.id,
            "func": str(job.func),
            "trigger": str(job.trigger),
            "run_date": str(job.next_run_time),
            "kwargs": job.kwargs
        })
    return job_list

def scheduler_get_job(job_id):
    jobs = scheduler.get_jobs()

    for job in jobs:
        if job.id == job_id:
            return {
                "id": job.id,
                "func": str(job.func),
                "trigger": str(job.trigger),
                "run_date": str(job.next_run_time),
                "kwargs": job.kwargs
            }

    return f"Job {job_id} not found"
