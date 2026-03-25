# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `/docs`.

## Architecture

Single-module FastAPI backend with SQLite, using a simple layered structure:

- `backend/db.py` — SQLAlchemy engine + session factory. SQLite at `./adhd.db` with SQL echo enabled.
- `backend/models.py` — Two ORM models: `Task` (status: `pending | done | skipped`) and `DayPlanEntry` (links a task to a date + position).
- `backend/schemas.py` — Pydantic schemas for tasks and day plan operations.
- `backend/main.py` — FastAPI app. Tables are auto-created on startup.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check |
| POST | `/tasks` | Create task (goes to pool) |
| GET | `/tasks/pool?for_date=` | Pool: pending tasks not in today's plan |
| PATCH | `/tasks/{id}` | Update status (pending/done/skipped) |
| GET | `/plan/{date}` | Get day's plan, ordered by position |
| POST | `/plan/{date}/{task_id}` | Add task to plan (drag from pool) |
| DELETE | `/plan/{date}/{task_id}` | Return task to pool (drag back) |
| PATCH | `/plan/{date}/{task_id}/position` | Reorder within plan |
| POST | `/plan/{date}/close` | End of day: return non-done tasks to pool |

## Key Design Decisions

- **Pool** = pending tasks with no `DayPlanEntry` for the target date. No separate pool table.
- **Auto-return** = `POST /plan/{date}/close` deletes non-done entries; tasks themselves stay as `pending`.
- Task states are intentionally **fully reversible** (ADHD-friendly design principle).
- No migration tooling — schema changes require manual DB handling or dropping `adhd.db`.
- No requirements.txt; dependencies live only in `.venv`. To inspect: `source backend/.venv/bin/activate && pip list`.
