from datetime import date, datetime
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str


class TaskUpdate(BaseModel):
    status: str


class TaskRead(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None

    class Config:
        from_attributes = True


class PlanEntryRead(BaseModel):
    """日计划中的一条任务，包含排序位置。"""
    task: TaskRead
    position: int

    class Config:
        from_attributes = True


class PlanEntryAdd(BaseModel):
    """将任务拖入日计划时的请求体。"""
    position: int = 0


class DayCloseResult(BaseModel):
    """关闭当天计划后的结果：返回池的任务数量。"""
    returned_to_pool: int
