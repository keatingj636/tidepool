# 🦞 Tidepool — ADHD Task Management

A calm, no-guilt task manager designed for people with ADHD.

Tasks live in a **pool**. Each day, you pick a few to focus on. Anything you don't finish flows back to the pool automatically — no failed deadlines, no shame, just a fresh start every morning.

---

## Features

- **Task Pool** — a persistent backlog of everything you want to do, with no pressure
- **Daily Plan** — drag tasks from the pool into today's list; focus on what matters now
- **Focus Mode** — shows only 3 tasks at a time to prevent choice paralysis
- **Calendar View** — tap any date to see or plan tasks for that day
- **No-guilt completion** — done tasks show crossed out at the bottom; accidentally ticked? tap to undo
- **End-of-day close** — one tap returns all unfinished tasks to the pool for tomorrow
- **Fully in Mandarin** — English and other language packs planned for future versions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) |
| Backend | Python FastAPI |
| Database | SQLite |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- [Expo Go](https://expo.dev/go) installed on your Android phone

### 1. Start the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `/docs`.

### 2. Configure the Frontend

Find your machine's local IP address:

```bash
ip addr show | grep "inet " | grep -v 127   # Linux
ipconfig getifaddr en0                        # macOS
```

Edit `frontend/src/api.js` and set `BASE_URL` to your machine's IP:

```js
const BASE_URL = 'http://192.168.x.x:8000';
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. Make sure your phone and computer are on the same Wi-Fi network.

---

## Project Structure

```
tidepool/
├── backend/
│   ├── main.py       # FastAPI routes
│   ├── models.py     # SQLAlchemy ORM models
│   ├── schemas.py    # Pydantic schemas
│   └── db.py         # Database connection
├── frontend/
│   ├── App.js        # Main screen
│   └── src/
│       ├── api.js    # API client
│       └── theme.js  # Color palette
└── future-features.md
```

---

## Roadmap

See [`future-features.md`](./future-features.md) for planned features including recurring tasks, language packs, and more.

---

*Built with 🦞 by the Tidepool team.*
