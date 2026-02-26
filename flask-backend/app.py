"""
ResumeAI - Flask Resume Screening System
TF-IDF + Cosine Similarity scoring engine with bulk upload support
"""
import os, re, csv, io, uuid, math
from collections import Counter
from flask import Flask, request, jsonify, render_template, send_file
from werkzeug.utils import secure_filename
import sqlite3

# --- PDF & DOCX extraction ---
import pdfplumber
from docx import Document

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ===================== DATABASE =====================

def get_db():
    db = sqlite3.connect('resumes.db')
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.execute('''CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT,
        skills TEXT, score REAL, breakdown TEXT, filename TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    db.commit()
    db.close()

init_db()

# ===================== TEXT EXTRACTION =====================

def extract_pdf(path):
    with pdfplumber.open(path) as pdf:
        return "\n".join(p.extract_text() or '' for p in pdf.pages)

def extract_docx(path):
    return "\n".join(p.text for p in Document(path).paragraphs)

def extract_text(path):
    ext = path.rsplit('.', 1)[-1].lower()
    if ext == 'pdf': return extract_pdf(path)
    if ext in ('docx', 'doc'): return extract_docx(path)
    raise ValueError(f"Unsupported format: .{ext}")

# ===================== INFO EXTRACTION =====================

def extract_name(text):
    for line in text.split('\n')[:5]:
        line = line.strip()
        if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$', line) and len(line) < 50:
            return line
    return text.split('\n')[0][:40].strip() or 'Unknown'

def extract_email(text):
    m = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text)
    return m.group() if m else ''

def extract_phone(text):
    m = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', text)
    return m.group() if m else ''

COMMON_SKILLS = [
    'javascript','typescript','python','java','c++','c#','ruby','go','rust','swift',
    'react','angular','vue','node.js','express','django','flask','spring',
    'html','css','sass','tailwind','bootstrap','sql','mysql','postgresql','mongodb',
    'redis','aws','azure','gcp','docker','kubernetes','terraform','git','ci/cd',
    'machine learning','deep learning','nlp','tensorflow','pytorch',
    'agile','scrum','rest api','graphql','microservices','figma','excel',
    'power bi','tableau','leadership','management','project management',
    'data analysis','data science','devops','linux','security','salesforce','sap'
]

def extract_skills(text):
    t = text.lower()
    return [s for s in COMMON_SKILLS if s in t]

# ===================== TF-IDF SCORING =====================

def tokenize(text):
    return [w for w in re.sub(r'[^a-z0-9+#.\s]', ' ', text.lower()).split() if len(w) > 1]

def tfidf_vectors(doc_tokens, query_tokens):
    vocab = list(set(query_tokens))
    corpus = [doc_tokens, query_tokens]
    vectors = []
    for tokens in corpus:
        vec = []
        for term in vocab:
            tf = sum(1 for t in tokens if term in t) / max(len(tokens), 1)
            df = sum(1 for d in corpus if any(term in t for t in d))
            idf_val = math.log((len(corpus) + 1) / (df + 1)) + 1
            vec.append(tf * idf_val)
        vectors.append(vec)
    return vectors

def cosine_sim(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    mag = math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(x*x for x in b))
    return dot / mag if mag else 0

def score_category(text, keywords):
    if not keywords: return 0, []
    lower = text.lower()
    matched = [k for k in keywords if k.lower() in lower]
    doc_tok, kw_tok = tokenize(text), [t for k in keywords for t in tokenize(k)]
    vecs = tfidf_vectors(doc_tok, kw_tok)
    sim = cosine_sim(vecs[0], vecs[1])
    direct = len(matched) / len(keywords)
    return min(100, round((direct * 0.6 + sim * 0.4) * 100)), matched

def extract_experience_years(text):
    years = [int(m.group(1)) for m in re.finditer(r'(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)', text, re.I)]
    return max(years) if years else 0

def score_resume(text, requirements):
    breakdown = []
    total_w, total_ws = 0, 0
    for req in requirements:
        cat, kws, weight = req['category'], req['keywords'], req['weight']
        if cat == 'experience':
            yrs = extract_experience_years(text)
            target = int(kws[0]) if kws else 3
            sc = min(100, round((yrs / target) * 100)) if target else 0
            matched = [f'{yrs} years'] if yrs else []
        elif cat == 'education':
            edu = ['phd','doctorate','master','mba','bachelor','b.sc','m.sc','b.tech','associate']
            found = [e for e in edu + [k.lower() for k in kws] if e in text.lower()]
            sc = min(100, round(len(found) / max(len(kws), 1) * 100)) if found else 0
            matched = found
        else:
            sc, matched = score_category(text, kws)
        ws = sc * weight / 100
        total_ws += ws; total_w += weight
        breakdown.append({'label': req['label'], 'category': cat, 'score': sc,
                          'weight': weight, 'weightedScore': round(ws), 'matched': matched})
    final = round(total_ws / total_w * 100) if total_w else 0
    return final, breakdown

# ===================== ROUTES =====================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/screen', methods=['POST'])
def screen_resumes():
    import json
    files = request.files.getlist('resumes')
    reqs = json.loads(request.form.get('requirements', '[]'))
    if not files: return jsonify({'error': 'No files uploaded'}), 400
    if not reqs: return jsonify({'error': 'No requirements set'}), 400

    db = get_db()
    results = []
    for f in files:
        fname = secure_filename(f.filename)
        path = os.path.join(app.config['UPLOAD_FOLDER'], fname)
        f.save(path)
        try:
            text = extract_text(path)
            name = extract_name(text)
            email = extract_email(text)
            phone = extract_phone(text)
            skills = extract_skills(text)
            score, breakdown = score_resume(text, reqs)
            cid = str(uuid.uuid4())
            db.execute('INSERT INTO candidates VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)',
                       (cid, name, email, phone, ','.join(skills), score, json.dumps(breakdown), fname))
            results.append({'id': cid, 'name': name, 'email': email, 'phone': phone,
                            'skills': skills, 'score': score, 'breakdown': breakdown, 'file': fname})
        except Exception as e:
            results.append({'file': fname, 'error': str(e)})
        finally:
            os.remove(path) if os.path.exists(path) else None
    db.commit(); db.close()
    results.sort(key=lambda r: r.get('score', 0), reverse=True)
    return jsonify(results)

@app.route('/api/export')
def export_csv():
    db = get_db()
    rows = db.execute('SELECT * FROM candidates ORDER BY score DESC').fetchall()
    db.close()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(['Rank','Name','Email','Phone','Skills','Score','File'])
    for i, r in enumerate(rows, 1):
        w.writerow([i, r['name'], r['email'], r['phone'], r['skills'], r['score'], r['filename']])
    buf.seek(0)
    return send_file(io.BytesIO(buf.getvalue().encode()), mimetype='text/csv',
                     as_attachment=True, download_name='results.csv')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
