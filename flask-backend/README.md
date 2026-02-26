# ResumeAI - Flask Backend

## Quick Start (Local)
```bash
cd flask-backend
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```

## Deploy on Render
1. Push `flask-backend/` to a GitHub repo (as root)
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your repo
4. Settings:
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Click **Deploy**

## Project Structure
```
flask-backend/
├── app.py              # Main app: routes, scoring engine, DB
├── templates/
│   └── index.html      # Single-page frontend (vanilla JS)
├── requirements.txt    # Python dependencies
├── Procfile            # Render/Heroku start command
└── README.md
```

## Scoring Algorithm
- **TF-IDF + Cosine Similarity** for keyword/skill matching
- **Direct keyword match** (60% weight) + **TF-IDF similarity** (40% weight)
- Weighted categories: Skills, Experience, Education, Certifications, Keywords
- Each category score × weight → final percentage

## Database Schema (SQLite)
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT | Extracted candidate name |
| email | TEXT | Extracted email |
| phone | TEXT | Extracted phone |
| skills | TEXT | Comma-separated skills |
| score | REAL | Final percentage score |
| breakdown | TEXT | JSON score breakdown |
| filename | TEXT | Original file name |
| created_at | TIMESTAMP | Upload timestamp |
