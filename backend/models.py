"""
ADHD 友好 Task 数据模型。
单表 Task + DayPlanEntry，SQLite，无业务逻辑。
"""

from datetime import datetime, date, timezone

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


def _utc_now() -> datetime:
    """当前 UTC 时间，用于 created_at / updated_at 默认值。"""
    return datetime.now(timezone.utc)


class Task(Base):
    """
    任务表。状态可逆：pending / done / skipped 均可互相切换。
    未分配到任何日计划的 pending 任务即为「任务池」。
    """

    __tablename__ = "tasks"

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'done', 'skipped')",
            name="task_status_check",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utc_now, onupdate=_utc_now)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    plan_entries: Mapped[list["DayPlanEntry"]] = relationship("DayPlanEntry", back_populates="task")


class DayPlanEntry(Base):
    """
    日计划条目。记录某个任务被分配到哪一天，以及在列表中的排序位置。
    删除此条目即为「归还任务池」，任务本身状态不变。
    """

    __tablename__ = "day_plan_entries"

    __table_args__ = (
        # 同一任务同一天只能出现一次
        UniqueConstraint("task_id", "date", name="uq_task_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    task: Mapped["Task"] = relationship("Task", back_populates="plan_entries")
