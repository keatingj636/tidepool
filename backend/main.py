from datetime import date, datetime, timezone

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import exists
from sqlalchemy.orm import Session

from db import SessionLocal, engine, Base
from models import Task, DayPlanEntry
from schemas import (
    TaskCreate, TaskRead, TaskUpdate,
    PlanEntryRead, PlanEntryAdd, DayCloseResult,
)

app = FastAPI(title="ADHD Helper API")

# 启动时创建所有表
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok"}


# ── Tasks (Pool) ──────────────────────────────────────────────────────────────

@app.post("/tasks", response_model=TaskRead)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """新建任务，自动进入任务池（status=pending，未分配日计划）。"""
    task = Task(title=task_in.title, status="pending")
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.get("/tasks/pool", response_model=list[TaskRead])
def get_pool(db: Session = Depends(get_db)):
    """
    返回任务池：status=pending 且未被分配到任何日期的任务。
    一旦任务被加入任意日期的计划，就从任务池中消失，直到计划关闭后归还。
    """
    assigned = db.query(DayPlanEntry.task_id).subquery()
    return (
        db.query(Task)
        .filter(Task.status == "pending", ~Task.id.in_(assigned))
        .all()
    )


@app.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task_status(task_id: int, body: TaskUpdate, db: Session = Depends(get_db)):
    """更新任务状态（pending / done / skipped）。"""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.status not in ("pending", "done", "skipped"):
        raise HTTPException(status_code=422, detail="Invalid status")

    task.status = body.status
    task.closed_at = datetime.now(timezone.utc) if body.status == "done" else None
    db.commit()
    db.refresh(task)
    return task


# ── Day Plan ──────────────────────────────────────────────────────────────────

@app.get("/plan/{plan_date}", response_model=list[PlanEntryRead])
def get_plan(plan_date: date, db: Session = Depends(get_db)):
    """获取某天的日计划，按 position 排序。"""
    return (
        db.query(DayPlanEntry)
        .filter(DayPlanEntry.date == plan_date)
        .order_by(DayPlanEntry.position)
        .all()
    )


@app.post("/plan/{plan_date}/{task_id}", response_model=PlanEntryRead)
def add_to_plan(plan_date: date, task_id: int, body: PlanEntryAdd, db: Session = Depends(get_db)):
    """将任务从池拖入指定日期的计划。"""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    existing = (
        db.query(DayPlanEntry)
        .filter(DayPlanEntry.task_id == task_id, DayPlanEntry.date == plan_date)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Task already in plan for this date")

    entry = DayPlanEntry(task_id=task_id, date=plan_date, position=body.position)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.delete("/plan/{plan_date}/{task_id}", status_code=204)
def remove_from_plan(plan_date: date, task_id: int, db: Session = Depends(get_db)):
    """将任务从日计划拖回任务池（删除条目，任务状态不变）。"""
    entry = (
        db.query(DayPlanEntry)
        .filter(DayPlanEntry.task_id == task_id, DayPlanEntry.date == plan_date)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()


@app.patch("/plan/{plan_date}/{task_id}/position", response_model=PlanEntryRead)
def reorder_plan_entry(plan_date: date, task_id: int, body: PlanEntryAdd, db: Session = Depends(get_db)):
    """拖拽排序：更新任务在当天计划中的位置。"""
    entry = (
        db.query(DayPlanEntry)
        .filter(DayPlanEntry.task_id == task_id, DayPlanEntry.date == plan_date)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.position = body.position
    db.commit()
    db.refresh(entry)
    return entry


@app.post("/plan/{plan_date}/close", response_model=DayCloseResult)
def close_day(plan_date: date, db: Session = Depends(get_db)):
    """
    关闭当天计划：将所有未完成（非 done）的条目删除，任务自动归还任务池。
    通常由每日定时任务或用户手动触发。
    """
    entries = (
        db.query(DayPlanEntry)
        .join(Task)
        .filter(DayPlanEntry.date == plan_date, Task.status != "done")
        .all()
    )
    count = len(entries)
    for entry in entries:
        db.delete(entry)
    db.commit()
    return DayCloseResult(returned_to_pool=count)
