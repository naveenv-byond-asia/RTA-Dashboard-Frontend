# RTA Dashboard

Local dashboard for exploring synthetic RTA kiosk conversations and analytics.

## Prerequisites

- Node.js 18+
- npm
- Python 3.10+ (only if you plan to run the backend or regenerate data)

## Launch the dashboard (frontend)

```bash
cd frontend
npm install
npm run dev
```

Then open the local URL printed by Vite (usually `http://localhost:5173`).

## Optional: regenerate dummy data

```bash
python dummy_data/generate_dummy_conversations.py \
  --knowledge-base dummy_data/knowledge_base.json \
  --count 400 \
  --csv-output dummy_data/data/conversations.csv \
  --json-output dummy_data/data/conversations.json
```

## Optional: run the backend (Django)

```bash
python -m venv .venv
source .venv/bin/activate
pip install django
python backend/manage.py runserver
```
