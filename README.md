# Nain AI – Diabetic Retinopathy Screening System

Nain AI is a role-based system for diabetic retinopathy (DR) screening. It combines a Django backend, a separate ML server for fundus image analysis, and a React.js frontend (in progress) into one end-to-end workflow — from patient creation to doctor review and result collection.

---

## Tech Stack

| Layer      | Technology                  |
|------------|------------------------------|
| Frontend   | React.js *(in progress)*    |
| Backend    | Django + Django REST Framework |
| Database   | SQLite (Django ORM)         |
| Auth       | JWT Authentication           |
| ML Service | PyTorch + EfficientNet-B0 (port `8001`) — see [ML Service](#ml-service-details) |

---

## System Architecture

```
Health Worker
     │
     ▼
Create Patient → Create Screening → Upload Fundus Image
     │
     ▼
Django Backend ───► ML Server
                        │
                        ├── Image Quality Check
                        ├── DR Prediction + Confidence
                        ├── Class Probabilities
                        ├── Retinal Analysis
                        └── Grad-CAM
     │
     ▼
Auto-Generated Report → Referral Created
     │
     ▼
Admin Assigns Doctor → Doctor Reviews → Health Worker Collects Result
```

---

## User Roles

| Role | Can Do |
|------|--------|
| **Admin** | Manage users, assign doctors to referrals, view system-wide stats |
| **Doctor** | View & review assigned referrals, add clinical notes |
| **Health Worker** | Create patients/screenings, upload images, trigger ML analysis, collect results |

---

## Core Workflow (Backend + ML)

1. **Create Patient** – `POST /api/patients/`
2. **Create Screening** – `POST /api/screenings/` → status `CREATED`
3. **Upload Fundus Image** – `POST /api/screenings/<id>/upload/` → status `IMAGE_UPLOADED`
4. **Run ML Analysis** – `POST /api/screenings/<id>/analyze/`
   - ML server checks image quality (resolution, brightness, contrast, sharpness, etc.)
   - Returns DR prediction (No DR / Mild / Moderate / Severe / Proliferative), confidence, probabilities, retinal analysis, and Grad-CAM
5. **Report Auto-Generated** – `GET /api/screenings/<id>/report/`
6. **Referral Auto-Created** – status flow: `PENDING → ASSIGNED → REVIEWED → COLLECTED`
7. **Admin Assigns Doctor** – `PATCH /api/referrals/<id>/assign-doctor/`
8. **Doctor Reviews & Adds Notes** – `PATCH /api/referrals/<id>/review/`
9. **Health Worker Collects Result** – `PATCH /api/referrals/<id>/collect/`

**Screening status flow:** `CREATED → IMAGE_UPLOADED → COMPLETED`
**Referral status flow:** `PENDING → ASSIGNED → REVIEWED → COLLECTED`

---

## ML Service Details

The ML server (`nain_ai_inference.py`) runs a trained **EfficientNet-B0** model for 5-class DR severity grading.

**Tech used:**

| Purpose | Tech |
|---|---|
| Deep Learning | PyTorch, Torchvision |
| Model | EfficientNet-B0 (`final_best_dr_model.pth`) |
| Image Processing | OpenCV, NumPy, Pillow |
| Explainability | PyTorch Grad-CAM |

**How it works:**

1. **Quality Gate (OpenCV)** — checks 7 things (resolution, brightness, contrast, sharpness, retina coverage, fundus validity, cropping) → result: `GOOD` / `BORDERLINE` / `POOR`. `POOR` images are rejected before classification.
2. **Preprocessing** — image resized to 224×224, converted to a PyTorch tensor.
3. **Classification** — EfficientNet-B0 outputs 5 logits → converted to probabilities via Softmax → highest probability = predicted DR grade (`No DR / Mild / Moderate / Severe / Proliferative`).
4. **Grad-CAM** — generates a heatmap + overlay showing which image regions influenced the prediction.
5. **Retinal Interpretation** — the predicted grade is mapped to a description of typical associated features (e.g. Moderate → Exudates, Hemorrhages). This is a fixed mapping, not a separate lesion-detection model.

**Note:** This is an AI-assisted screening tool, not a clinical diagnostic replacement — Grad-CAM shows influence regions, not exact lesion segmentation.

---

## Dashboards

- `GET /api/dashboard/admin/` — user, patient, screening, report & referral stats
- `GET /api/dashboard/doctor/` — doctor's own referral stats
- `GET /api/dashboard/health-worker/` — screenings created & referrals collected

---

## API Reference (Quick List)

```
/api/auth/
/api/admin/users/
/api/patients/
/api/screenings/
/api/screenings/<id>/upload/
/api/screenings/<id>/analyze/
/api/screenings/<id>/report/
/api/reports/
/api/referrals/
/api/referrals/<id>/assign-doctor/
/api/referrals/<id>/review/
/api/referrals/<id>/collect/
/api/dashboard/admin/
/api/dashboard/doctor/
/api/dashboard/health-worker/
```

---

## Getting Started

```bash
# Backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# → http://127.0.0.1:8000

# ML Server must be running before /analyze/ is called
# → http://127.0.0.1:8001
```

Frontend (React.js) setup instructions will be added once integration is complete.

---

## Project Status

✅ **Completed:** Auth & roles, patients, screenings, image upload, ML integration (prediction, quality, probabilities, Grad-CAM), reports, referrals, doctor assignment/review, collection, all dashboards, search/filters/analytics, end-to-end backend testing.

🚧 **Pending:** React.js frontend, frontend–backend integration, full-system testing, production deployment & security config.

---

## Roadmap

```
Backend + ML Workflow  ✅ Done
        ↓
React Frontend         → In Progress
        ↓
Frontend–Backend Integration
        ↓
Full System Testing
        ↓
Deployment
```