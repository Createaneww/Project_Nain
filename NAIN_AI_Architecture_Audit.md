# NAIN AI — Complete Backend & System Architecture Audit
**SIH26038 | Explainable AI for Diabetic Retinopathy Screening**
*Audit Date: 2026-08-27 | Based on actual codebase inspection*

---

## 1. Executive Summary

NAIN AI is an SIH project targeting rural diabetic retinopathy screening. The ML core — EfficientNet-B0 with 5-class DR classification, fundus quality gating, Grad-CAM explainability — is **fully built and working**. That is approximately 20–25% of the total system.

The remaining 75–80% — patient management, screening workflow, doctor review, referral logic, authentication, database, APIs, dashboards, and deployment — **does not exist yet**.

The project's current state is: *a working standalone ML script with no web backend around it*.

The most critical insight from the code audit:

> The `nain_ai_inference()` function returns NumPy arrays (`heatmap`, `overlay`, `original_image`) directly. These **cannot be serialized to JSON**. This is the single most critical integration issue that must be resolved before any API work begins.

The recommended architecture is a **single Django + DRF backend** that also hosts a FastAPI AI sub-service, wired together internally. This avoids over-engineering while keeping the ML service independently deployable when needed.

---

## 2. Current Project Audit

### What Was Actually Found in the Repository

| File | Size | Status |
|------|------|--------|
| `NAIN_AI_BACKEND_HANDOFF/model_loader.py` | 589 bytes | Exists, working |
| `NAIN_AI_BACKEND_HANDOFF/inference/nain_ai_inference.py` | 6,250 bytes | Exists, working |
| `NAIN_AI_BACKEND_HANDOFF/model/final_best_dr_model.pth` | ~15.6 MB | Exists |
| `NAIN_AI_BACKEND_HANDOFF/requirements.txt` | 105 bytes | Exists (minimal) |
| Django project folder | — | **Does not exist** |
| FastAPI / any web server | — | **Does not exist** |
| Database schema / migrations | — | **Does not exist** |
| Frontend | — | **Does not exist** |

### Component-Level Audit Table

| Component | Status | Technology | What Exists | What Is Missing |
|-----------|--------|------------|-------------|-----------------|
| ML Model (EfficientNet-B0) | ✅ Complete | PyTorch | Trained weights (15.6MB .pth), 5-class DR | Nothing missing |
| Model Loading | ✅ Complete | PyTorch | `load_model()` function | Web startup lifecycle hook |
| DR Classification | ✅ Complete | EfficientNet-B0 | 5-class output with softmax | — |
| Confidence / Probabilities | ✅ Complete | PyTorch | Per-class float probabilities returned | — |
| Image Quality Assessment | ✅ Complete | OpenCV | 7-check quality gate (resolution, brightness, contrast, sharpness, coverage, fundus, cropping) | — |
| Grad-CAM | ✅ Complete | pytorch-grad-cam | Grayscale heatmap + RGB overlay generated | Images currently returned as NumPy arrays, not files |
| Inference Function | ✅ Complete | Python | `nain_ai_inference()` returns full result dict | NumPy arrays not JSON-serializable → **critical bug** |
| Image Storage | ❌ Not Built | — | Nothing | Needs MinIO or filesystem with Django FileField |
| API Layer | ❌ Not Built | — | Nothing | All endpoints need to be created |
| Backend Framework | ❌ Not Built | Django listed in requirements.txt but no project | requirements.txt mentions django | Full project structure needed |
| Database | ❌ Not Built | — | Nothing | All models needed |
| Authentication | ❌ Not Built | — | Nothing | JWT or session auth needed |
| User Roles (HW / Doctor / Admin) | ❌ Not Built | — | Nothing | Role model + permission system |
| Patient Management | ❌ Not Built | — | Nothing | Patient CRUD, health center association |
| Screening Workflow | ❌ Not Built | — | Nothing | Screening creation, status machine |
| Doctor Dashboard (API) | ❌ Not Built | — | Nothing | Queue, assigned cases, review actions |
| Doctor Review | ❌ Not Built | — | Nothing | Confirm/modify/reject AI result |
| Referral Workflow | ❌ Not Built | — | Nothing | Referral creation, hospital linking |
| Notifications | ❌ Not Built | — | Nothing | In-app or SMS |
| Admin Analytics | ❌ Not Built | — | Nothing | Aggregate stats |
| Frontend | ❌ Not Built | — | Nothing | All dashboards |
| Deployment | ❌ Not Built | — | Nothing | Docker, hosting |
| Security / RBAC | ❌ Not Built | — | Nothing | All security measures |
| Offline/Weak-network support | ❌ Not Built | — | Nothing | Retry logic, pending upload state |

### Critical Bugs Found in Existing Code

**Bug 1 — NumPy arrays returned directly (CRITICAL)**
```python
# inference/nain_ai_inference.py lines 294-299
"heatmap": grayscale_cam,      # numpy ndarray → NOT JSON-serializable
"overlay": visualization,       # numpy ndarray → NOT JSON-serializable
"original_image": np.array(...) # numpy ndarray → NOT JSON-serializable
```
These will cause a `TypeError` the moment any API tries to return this dict as JSON.

**Bug 2 — Model reloaded per request risk**
The inference function signature accepts `model` and `cam` as arguments, which is correct. But there is no startup/singleton pattern defined — if someone naively calls `load_model()` per request, it will reload 15.6MB on every inference call.

**Bug 3 — `image_path` only (no bytes/buffer support)**
`check_fundus_quality()` and `nain_ai_inference()` only accept a file path string. When images arrive via HTTP multipart upload, you need to handle in-memory `bytes` or `BytesIO` objects, not just disk paths.

**Bug 4 — `requirements.txt` mixing AI and web deps without versioning**
`django`, `djangorestframework`, and `python-multipart` are listed alongside PyTorch — but `python-multipart` is a FastAPI dependency, not Django. This reveals an unresolved architectural decision.

---

## 3. Recommended Technology Stack

### Frontend
```
Technology: Next.js 14 (App Router)
Purpose: Health worker dashboard, doctor dashboard, admin dashboard
Why suitable: Server-side rendering gives fast initial load on slow connections.
              React ecosystem has good form libraries for patient registration.
              Can be deployed as a static export if server is constrained.
Mandatory now: YES — needed for MVP dashboards
```

```
Technology: Tailwind CSS
Purpose: Styling
Why suitable: Rapid development, consistent utility classes, good mobile responsiveness
Mandatory now: YES
```

### Backend
```
Technology: Django 4.2 LTS + Django REST Framework
Purpose: Main application server — auth, patient management, screening workflow,
         doctor review, referral, admin APIs
Why suitable: Django ORM is mature and handles complex relational data well.
              DRF gives serializers, viewsets, router in one package.
              Django Admin is free and gives admin interface instantly.
              Django has excellent migration tooling for evolving DB schema.
              LTS version means security patches for 3+ years.
Mandatory now: YES
```

```
Technology: FastAPI
Purpose: AI inference microservice — wraps the existing PyTorch pipeline
Why suitable: Async support, automatic OpenAPI docs, lightweight.
              Keeps ML dependencies (PyTorch, OpenCV, grad-cam) isolated
              from Django's environment.
              Model loads once at startup using lifespan events.
Mandatory now: YES — needed to wrap the existing ML code
```

### AI/ML Service
```
Technology: PyTorch 2.x + torchvision + pytorch-grad-cam + OpenCV
Purpose: The existing inference pipeline
Why suitable: Already built and tested. Do not change.
Mandatory now: YES (already exists)
```

### API Communication (Django ↔ FastAPI)
```
Technology: HTTP (httpx async client inside Django)
Purpose: Django backend calls FastAPI AI service as an internal HTTP call
Why suitable: Simple, debuggable, no message broker needed for MVP.
              FastAPI's /analyze endpoint is called by Django, not by the frontend.
Mandatory now: YES
```

### Database
```
Technology: PostgreSQL 15
Purpose: Primary relational database
Why suitable: Best-in-class for complex joins (Patient → Screening → Review → Referral).
              Django ORM first-class support.
              JSONB field for storing AI probability dictionaries natively.
              Free and open source.
Mandatory now: YES
```

### Image/Object Storage
```
Technology: MinIO (self-hosted S3-compatible)
Purpose: Store original fundus images, Grad-CAM heatmaps, overlays
Why suitable: S3-compatible API so you can switch to AWS S3 later without code changes.
              Can run on the same server for MVP.
              Does not store images in the database (keeps DB lean).
              Provides pre-signed URLs for secure time-limited image access.
Mandatory now: YES — images cannot go in the database
Alternative: Django FileField to local disk for the very first prototype, migrate to MinIO after
```

### Authentication
```
Technology: djangorestframework-simplejwt
Purpose: JWT-based login for health workers, doctors, admins
Why suitable: Stateless, works well with Next.js frontend fetch calls.
              Refresh token support.
Mandatory now: YES
```

### Background Tasks / Async Processing
```
Technology: Celery + Redis
Purpose: AI inference job queue — so image upload API returns immediately
          and inference runs in background
Why suitable: Prevents HTTP timeout on slow hardware.
              Enables retry if inference fails.
              Redis is lightweight for SIH scale.
Mandatory now: NO — for MVP, synchronous inference is acceptable.
              Add Celery in Phase 2 if inference takes >10 seconds.
```

### Cache
```
Technology: Redis (shared with Celery if added)
Purpose: Cache doctor queue counts, AI model warm state signal
Mandatory now: NO — add later
```

### Notification System
```
Technology: In-app notifications (DB-backed) + optional Twilio SMS
Purpose: Alert doctor when new case is assigned; alert health worker of result
Why suitable: DB notifications are zero-cost. Twilio SMS for rural areas where
              WhatsApp/email is unavailable.
Mandatory now: DB notifications YES. SMS — Phase 2.
```

### Deployment
```
Technology: Docker + Docker Compose
Purpose: Containerize Django, FastAPI, PostgreSQL, MinIO, Redis
Why suitable: Reproducible environment. Can run on a single VM for SIH demo.
Mandatory now: Set up Compose early. Full deployment is Phase 15.
```

```
Technology: Nginx
Purpose: Reverse proxy for Django and FastAPI
Mandatory now: Phase 15 only
```

### Logging & Error Monitoring
```
Technology: Python logging (structured) + Sentry
Purpose: Track errors in production
Why suitable: Sentry free tier is sufficient for SIH.
Mandatory now: Basic logging YES. Sentry — add before final demo.
```

---

## 4. Architecture Decision

**Decision: Django (main backend) + FastAPI (AI service) + Next.js (frontend)**

### Why NOT Django alone?
Django can technically run PyTorch, but:
- Mixing heavy ML dependencies with web app creates deployment headaches
- Model must be loaded at Django startup — Django is multi-process (gunicorn), each worker loads the model separately, wasting 15.6MB × N workers of RAM
- FastAPI's lifespan events load the model exactly once per process cleanly

### Why NOT FastAPI alone?
FastAPI lacks Django's ORM maturity, admin panel, migration tooling, and DRF's serializer ecosystem. Rebuilding patient/screening/referral models in SQLAlchemy from scratch adds unnecessary work for an SIH project.

### Why NOT only Django + DRF with embedded ML?
See Django alone reasoning. The correct separation is: **Django handles business logic, FastAPI handles ML inference.**

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│              Next.js 14 (App Router)                     │
│    Health Worker │ Doctor │ Admin  Dashboards            │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST JSON
┌──────────────────────────▼──────────────────────────────┐
│                 MAIN BACKEND                             │
│            Django 4.2 + DRF                              │
│                                                          │
│  Auth │ Patients │ Screenings │ Reviews │ Referrals      │
│  Notifications │ Admin APIs │ RBAC                       │
│                                                          │
│  Image Upload → saves to MinIO                           │
│  Triggers AI call → httpx POST to FastAPI                │
└───────────────┬────────────────────────┬────────────────┘
                │ Internal HTTP          │ ORM
┌───────────────▼───────────┐  ┌────────▼───────────────┐
│      AI SERVICE            │  │      PostgreSQL          │
│      FastAPI               │  │      Database            │
│                            │  │                          │
│  load_model() on startup   │  │  User, HealthCenter,     │
│  build_cam() on startup    │  │  Patient, Screening,     │
│  /analyze endpoint         │  │  FundusImage,            │
│  Returns JSON (no NumPy)   │  │  AIAnalysis,             │
│                            │  │  DoctorReview,           │
│  EfficientNet-B0           │  │  Referral,               │
│  Grad-CAM                  │  │  Notification,           │
│  Quality Gate              │  │  AuditLog                │
└───────────────┬────────────┘  └────────────────────────┘
                │ read image from MinIO
┌───────────────▼────────────────────────────────────────┐
│                   MinIO                                  │
│   original_images/   heatmaps/   overlays/              │
└────────────────────────────────────────────────────────┘
```

---

## 5. System Architecture Diagram

```
Rural Health Centre                    Cloud / Hospital Server
─────────────────                      ──────────────────────

[Fundus Camera]
      │ image capture
      ▼
[Health Worker Browser]
  Next.js client
      │
      │ 1. POST /api/patients/           → Django: create Patient
      │ 2. POST /api/screenings/         → Django: create Screening
      │ 3. POST /api/images/upload/      → Django: save image to MinIO
      │                                           trigger AI call
      │
      │                    [Django Backend]
      │                          │
      │                          │ httpx POST /analyze
      │                          │ {image_url: "minio://..."}
      │                          ▼
      │                    [FastAPI AI Service]
      │                          │
      │                          │ 1. Download image from MinIO
      │                          │ 2. check_fundus_quality()
      │                          │ 3. nain_ai_inference()
      │                          │ 4. Convert NumPy → PNG bytes
      │                          │ 5. Upload heatmap/overlay to MinIO
      │                          │ 6. Return JSON result
      │                          │
      │                    [Django Backend]
      │                          │
      │                          │ Save AIAnalysis to PostgreSQL
      │                          │ Calculate priority score
      │                          │ Assign to doctor queue
      │                          │ Create Notification
      │                          │
      │ 4. GET /api/screenings/{id}/result/  ← Poll result
      │ 5. GET AI Result + priority shown
      │
      ▼
[Doctor Browser]
  Next.js client (remote)
      │
      │ GET /api/doctor/queue/           → Django: pending reviews
      │ GET /api/screenings/{id}/        → Django: full case
      │   includes: original image URL (pre-signed MinIO)
      │   includes: heatmap URL (pre-signed MinIO)
      │   includes: overlay URL (pre-signed MinIO)
      │   includes: AI prediction, confidence, probabilities
      │
      │ POST /api/reviews/               → Django: save DoctorReview
      │   {decision: CONFIRM|MODIFY|REJECT, notes, final_grade}
      │
      │ POST /api/referrals/             → Django: create Referral
      │   {hospital_id, urgency, notes}
      │
      ▼
[Notification to Health Worker]
  "Case reviewed. Patient referred to [Hospital]."
```

---

## 6. User Roles and Permissions

### Role: HEALTH_WORKER
Tied to a specific HealthCenter.

**Can:**
- Register patients (at their own health center only)
- Create screening sessions
- Upload fundus images
- View AI result (read-only) for their own patients
- View referral outcome for their own patients
- Receive notifications about completed reviews

**Cannot:**
- Access any patient from another health center
- Modify AI results
- Create doctor reviews
- Access admin panel

### Role: OPHTHALMOLOGIST (Doctor)
Independent reviewer, assigned cases from any health center.

**Can:**
- View their assigned review queue
- Access full case: original image, AI result, Grad-CAM, probabilities
- Create/submit a DoctorReview (CONFIRM / MODIFY / REJECT)
  - CONFIRM: Accept AI prediction as final
  - MODIFY: Change the DR grade (with mandatory notes)
  - REJECT: Mark AI result unreliable (with mandatory notes)
- Create or approve a Referral
- View their own historical reviews

**Cannot:**
- Register patients
- Upload images
- Access cases not assigned to them (standard), or ALL cases (senior doctor only)
- Modify submitted reviews (audit requirement)

### Role: ADMIN
System-wide oversight.

**Can:**
- Manage users (create HW/Doctor accounts, assign health centers)
- View all patients, screenings, reviews, referrals across all centers
- View system analytics (cases per day, DR grade distribution, referral rates)
- Manage health center registry
- Manage hospital/referral center registry
- View audit logs

**Cannot (by convention):**
- Submit clinical reviews (admins are not clinicians)

### Role: PATIENT
**No login required.** Rural patients do not operate the system.

Patient data is entered by the health worker. Results are communicated via:
1. The health worker receives the notification and informs the patient verbally
2. Printed referral slip (future: SMS to patient's family member's phone)

---

## 7. Dashboard Structure

**Three dashboards are necessary and sufficient for the MVP.**

### Dashboard 1: Health Worker Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Patient registration, image upload, result viewing, referral tracking |
| **Users** | HEALTH_WORKER role |
| **Main Pages** | Home/Queue, Register Patient, New Screening, View Result, Referral Status |
| **Main Actions** | Register patient, start screening, upload image, view AI result, track referral |
| **Required Data** | Patient list (own center), Screening status, AI result summary, Referral outcome |

Pages:
```
/ (dashboard home)     → Today's cases, pending uploads, recent results
/patients/new          → Patient registration form
/patients/:id          → Patient history
/screenings/new        → Start screening, upload image
/screenings/:id        → View result (quality, prediction, confidence, priority)
/referrals/:id         → Track referral outcome
```

### Dashboard 2: Ophthalmologist Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Clinical review of AI-flagged cases, final decision, referral creation |
| **Users** | OPHTHALMOLOGIST role |
| **Main Pages** | Review Queue, Case Detail, Submit Review, Referral Management |
| **Main Actions** | View queue, open case, view original image + Grad-CAM, submit review, create referral |
| **Required Data** | Assigned screenings, AI analysis, image viewer, review form, referral form |

Pages:
```
/ (dashboard home)     → Review queue (sorted by priority + arrival time)
/cases/:screening_id   → Full case view:
                           → Original image viewer
                           → Grad-CAM overlay toggle
                           → AI prediction + confidence bars
                           → Per-class probability chart
                           → Review form (CONFIRM/MODIFY/REJECT + notes)
/referrals/new         → Create referral after review
/history               → Past reviews
```

### Dashboard 3: Admin Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | System management, user management, analytics |
| **Users** | ADMIN role |
| **Main Pages** | Overview, Users, Health Centers, Hospitals, Analytics, Audit Logs |
| **Main Actions** | Create users, assign centers, view system stats, view audit trail |
| **Required Data** | User list, center list, aggregate screening stats, DR distribution chart |

Pages:
```
/ (overview)           → System stats: total patients, screenings today, pending reviews
/users                 → Manage users
/health-centers        → Manage health center registry
/hospitals             → Manage referral hospital registry
/analytics             → Charts: screenings/day, DR grade distribution, referral rate
/audit-logs            → Who did what when
```

**Verdict:** Three dashboards are exactly right. Do not add a "Patient Portal" for the MVP — patients don't operate the system. Do not add a "Super Admin" dashboard — include super-admin views inside the Admin dashboard with role filtering.

---

## 8. Complete Patient-to-Doctor Workflow

```
STEP 1: Patient Arrives at Rural Health Centre
Actor: Health Worker
Action: Opens Health Worker Dashboard → clicks "Register Patient"
System: POST /api/patients/ → PostgreSQL creates Patient{patient_id: P-001}
Data stored: name, age, gender, contact (family), health_center_id, created_by

STEP 2: Screening Session Created
Actor: Health Worker
Action: Clicks "New Screening" for Patient P-001
System: POST /api/screenings/ → creates Screening{screening_id: S-001, patient: P-001, status: "PENDING_IMAGE"}
Data stored: Screening linked to Patient, status = PENDING_IMAGE

STEP 3: Fundus Image Captured and Uploaded
Actor: Health Worker (assisted by equipment)
Action: Captures image with fundus camera → uploads via dashboard
System:
  → POST /api/images/upload/ (multipart)
  → Django saves file to MinIO: original_images/S-001/img_001.jpg
  → Creates FundusImage{image_id: I-001, screening: S-001, storage_path: "minio://..."}
  → Updates Screening status: PENDING_IMAGE → PENDING_AI
  → Triggers AI analysis (synchronously for MVP)

STEP 4: AI Service Processes Image
Actor: System (automated)
System:
  → Django calls FastAPI: POST http://ai-service/analyze {image_path: MinIO URL}
  → FastAPI downloads image from MinIO
  → check_fundus_quality() runs 7-check quality gate

  CASE A — Quality: POOR
  → FastAPI returns {status: "REJECTED", quality: {...}}
  → Django updates FundusImage.quality_status = "POOR"
  → Screening status → QUALITY_FAILED
  → Health worker notified: "Image rejected. Please retake."

  CASE B — Quality: GOOD or BORDERLINE
  → nain_ai_inference() runs DR classification + Grad-CAM
  → FastAPI converts numpy arrays → PNG bytes → uploads to MinIO:
       heatmaps/S-001/heatmap_I-001.png
       overlays/S-001/overlay_I-001.png
  → FastAPI returns JSON:
    {status: "ACCEPTED", prediction: "Moderate", class_id: 2,
     confidence: 0.87, probabilities: {...},
     heatmap_path: "minio://...", overlay_path: "minio://..."}

STEP 5: AI Result Saved
Actor: System (automated)
System:
  → Django creates AIAnalysis{
      analysis_id: A-001,
      image: I-001,
      screening: S-001,
      status: "ACCEPTED",
      prediction: "Moderate",
      class_id: 2,
      confidence: 0.87,
      probabilities: {JSON},
      quality_data: {JSON},
      heatmap_path: "minio://...",
      overlay_path: "minio://...",
      is_referable: True  ← class_id >= 2 (Moderate/Severe/Proliferative)
    }
  → Priority score calculated:
      class_id 0 → priority 1 (routine)
      class_id 1 → priority 2 (low)
      class_id 2 → priority 3 (moderate - referable)
      class_id 3 → priority 4 (high - urgent referral)
      class_id 4 → priority 5 (critical - same-day)
  → Screening.status → PENDING_REVIEW
  → Case added to doctor queue

STEP 6: Doctor Receives Case
Actor: Ophthalmologist
System:
  → Notification created in DB: "New referable case assigned: S-001"
  → Doctor opens dashboard, sees queue sorted by priority (highest first)
  → GET /api/doctor/queue/ → returns list of pending screenings

STEP 7: Doctor Reviews Case Independently
Actor: Ophthalmologist
System:
  → GET /api/screenings/{S-001}/
  → Returns: patient demographics, original image (pre-signed MinIO URL),
             AI prediction + confidence, per-class probability chart,
             heatmap/overlay images (pre-signed MinIO URLs)
  → Doctor views ORIGINAL image first (independently)
  → Doctor can toggle Grad-CAM overlay
  → Doctor reads AI prediction and confidence AFTER forming own opinion

STEP 8: Doctor Submits Review
Actor: Ophthalmologist
Action: Selects CONFIRM / MODIFY / REJECT + writes clinical notes
System:
  → POST /api/reviews/
  → Creates DoctorReview{
      review_id: R-001,
      screening: S-001,
      analysis: A-001,
      doctor: Dr. X,
      decision: "CONFIRM",           ← or "MODIFY" or "REJECT"
      final_grade: "Moderate",       ← doctor's final clinical grade
      notes: "...",
      reviewed_at: timestamp
    }
  → Screening.status → REVIEWED

STEP 9: Referral Created
Actor: Ophthalmologist (or auto-triggered for class_id >= 2)
System:
  → POST /api/referrals/
  → Creates Referral{
      referral_id: REF-001,
      screening: S-001,
      review: R-001,
      patient: P-001,
      hospital: Hospital-X,
      urgency: "MODERATE",
      notes: "Patient needs laser evaluation",
      status: "CREATED"
    }

STEP 10: Health Worker Notified
Actor: System (automated)
System:
  → Notification sent to Health Worker: "Review complete for Patient P-001.
    Referred to [Hospital X]. Grade: Moderate DR."
  → Screening.status → COMPLETE
  → Health Worker opens result page, prints referral slip
  → Health Worker communicates outcome to patient/family verbally
```

---

## 9. Database Design

### Entity Relationship Overview

```
User (Auth)
  │
  ├── HealthCenter (many health workers belong to one center)
  │
Patient
  │ (registered at a HealthCenter, by a User)
  └── Screening
        │
        ├── FundusImage
        │     └── AIAnalysis
        │
        ├── DoctorReview
        │
        └── Referral

Notification → linked to User
AuditLog → linked to any action + User
```

### Table Definitions

#### User
```
id              UUID (PK)
email           VARCHAR UNIQUE
password_hash   VARCHAR
role            ENUM(HEALTH_WORKER, OPHTHALMOLOGIST, ADMIN)
first_name      VARCHAR
last_name       VARCHAR
phone           VARCHAR nullable
health_center   FK → HealthCenter nullable (only for HW)
is_active       BOOLEAN default True
created_at      TIMESTAMP
last_login      TIMESTAMP
```

#### HealthCenter
```
id              UUID (PK)
name            VARCHAR
district        VARCHAR
state           VARCHAR
pincode         VARCHAR
gps_lat         DECIMAL nullable
gps_lon         DECIMAL nullable
is_active       BOOLEAN
created_at      TIMESTAMP
```

#### Hospital (referral destinations)
```
id              UUID (PK)
name            VARCHAR
address         TEXT
district        VARCHAR
state           VARCHAR
contact_phone   VARCHAR
speciality      VARCHAR (e.g., "Retina Centre")
is_active       BOOLEAN
```

#### Patient
```
id              UUID (PK)
patient_uid     VARCHAR UNIQUE (auto-generated e.g. "NAIN-2026-0001")
first_name      VARCHAR
last_name       VARCHAR
date_of_birth   DATE
gender          ENUM(M, F, OTHER)
contact_phone   VARCHAR nullable  (family member's phone)
address         TEXT nullable
health_center   FK → HealthCenter
registered_by   FK → User
diabetes_type   ENUM(TYPE1, TYPE2, UNKNOWN) nullable
diabetes_years  INT nullable
created_at      TIMESTAMP
```

#### Screening
```
id              UUID (PK)
screening_uid   VARCHAR UNIQUE (e.g. "SCR-2026-00042")
patient         FK → Patient
health_center   FK → HealthCenter
performed_by    FK → User (Health Worker)
assigned_doctor FK → User (Ophthalmologist) nullable
status          ENUM(
                  PENDING_IMAGE,
                  QUALITY_FAILED,
                  PENDING_AI,
                  AI_COMPLETE,
                  PENDING_REVIEW,
                  REVIEWED,
                  COMPLETE,
                  CANCELLED
                )
priority        INT (1-5, calculated after AI)
is_referable    BOOLEAN nullable
notes           TEXT nullable
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### FundusImage
```
id              UUID (PK)
screening       FK → Screening
eye_side        ENUM(LEFT, RIGHT, UNKNOWN)
original_path   VARCHAR (MinIO path)
original_url    VARCHAR (cached pre-signed URL, optional)
quality_status  ENUM(GOOD, BORDERLINE, POOR, PENDING)
quality_data    JSONB  (stores all 7 check results + scores)
uploaded_at     TIMESTAMP
```

#### AIAnalysis
```
id              UUID (PK)
image           FK → FundusImage (OneToOne)
screening       FK → Screening
status          ENUM(ACCEPTED, REJECTED)
prediction      VARCHAR nullable  (e.g. "Moderate")
class_id        INT nullable      (0-4)
confidence      FLOAT nullable    (0.0-1.0)
probabilities   JSONB nullable    ({"No DR": 0.02, "Mild": 0.05, ...})
heatmap_path    VARCHAR nullable  (MinIO path)
overlay_path    VARCHAR nullable  (MinIO path)
is_referable    BOOLEAN nullable  (class_id >= 2)
rejection_reason VARCHAR nullable
inference_ms    INT nullable      (performance tracking)
model_version   VARCHAR default "efficientnet-b0-v1"
created_at      TIMESTAMP
```

#### DoctorReview
```
id              UUID (PK)
screening       FK → Screening
analysis        FK → AIAnalysis
doctor          FK → User
decision        ENUM(CONFIRM, MODIFY, REJECT)
final_grade     VARCHAR  (doctor's clinical DR grade — may differ from AI)
final_class_id  INT nullable
notes           TEXT (mandatory for MODIFY and REJECT)
reviewed_at     TIMESTAMP
created_at      TIMESTAMP

CONSTRAINT: one review per screening (unique on screening)
```

#### Referral
```
id              UUID (PK)
referral_uid    VARCHAR UNIQUE (e.g. "REF-2026-00018")
screening       FK → Screening
review          FK → DoctorReview nullable
patient         FK → Patient
hospital        FK → Hospital nullable
urgency         ENUM(ROUTINE, MODERATE, URGENT, EMERGENCY)
notes           TEXT
status          ENUM(CREATED, SENT, ACKNOWLEDGED, COMPLETED, CANCELLED)
referred_by     FK → User (Doctor or Admin)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### Notification
```
id              UUID (PK)
recipient       FK → User
title           VARCHAR
message         TEXT
type            ENUM(AI_COMPLETE, REVIEW_COMPLETE, REFERRAL_CREATED, QUALITY_FAILED, SYSTEM)
related_screening FK → Screening nullable
is_read         BOOLEAN default False
created_at      TIMESTAMP
```

#### AuditLog
```
id              UUID (PK)
actor           FK → User nullable
action          VARCHAR  (e.g. "REVIEW_SUBMITTED", "PATIENT_CREATED", "REFERRAL_CREATED")
model_name      VARCHAR  (e.g. "Screening", "DoctorReview")
object_id       VARCHAR  (UUID of affected object)
old_value       JSONB nullable
new_value       JSONB nullable
ip_address      VARCHAR nullable
created_at      TIMESTAMP
```

---

## 10. API Plan

### Authentication APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/auth/login/` | Public | Get JWT access + refresh tokens |
| POST | `/api/auth/token/refresh/` | Authenticated | Refresh access token |
| POST | `/api/auth/logout/` | Authenticated | Blacklist refresh token |
| GET | `/api/auth/me/` | Authenticated | Get current user profile |
| PUT | `/api/auth/change-password/` | Authenticated | Change own password |

### Health Centre APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/health-centers/` | Admin | List all health centers |
| POST | `/api/health-centers/` | Admin | Create health center |
| GET | `/api/health-centers/{id}/` | Admin | Get health center detail |
| PUT | `/api/health-centers/{id}/` | Admin | Update health center |

### Patient APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/patients/` | HW (own center), Admin (all) | List patients |
| POST | `/api/patients/` | Health Worker | Register new patient |
| GET | `/api/patients/{id}/` | HW (own), Doctor (assigned), Admin | Get patient detail |
| PUT | `/api/patients/{id}/` | HW (own center) | Update patient info |
| GET | `/api/patients/{id}/screenings/` | HW (own), Doctor, Admin | Patient screening history |

### Screening APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/screenings/` | HW (own), Doctor (assigned), Admin | List screenings |
| POST | `/api/screenings/` | Health Worker | Create screening session |
| GET | `/api/screenings/{id}/` | HW (own), Doctor (assigned), Admin | Full screening detail |
| GET | `/api/screenings/{id}/result/` | HW (own), Doctor | AI result + review status |
| PATCH | `/api/screenings/{id}/cancel/` | HW (own), Admin | Cancel screening |
| GET | `/api/doctor/queue/` | Doctor | Get pending review queue |

### Image APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/screenings/{id}/images/upload/` | Health Worker | Upload fundus image |
| GET | `/api/images/{id}/` | HW (own), Doctor, Admin | Image metadata + URLs |
| GET | `/api/images/{id}/original-url/` | HW (own), Doctor | Get pre-signed MinIO URL for original |
| GET | `/api/images/{id}/heatmap-url/` | Doctor, Admin | Get pre-signed URL for heatmap |
| GET | `/api/images/{id}/overlay-url/` | Doctor, Admin | Get pre-signed URL for overlay |

### AI Analysis APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/analysis/{id}/` | HW (own), Doctor, Admin | Get AI analysis result |
| POST | `/api/analysis/{image_id}/retry/` | Admin | Retry failed analysis |

### Doctor Review APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/reviews/` | Doctor | Submit doctor review |
| GET | `/api/reviews/{id}/` | Doctor (own), Admin | Get review detail |
| GET | `/api/doctor/reviews/` | Doctor | List own reviews history |

### Referral APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/referrals/` | Doctor, Admin | Create referral |
| GET | `/api/referrals/{id}/` | HW (own patient), Doctor, Admin | Get referral detail |
| PATCH | `/api/referrals/{id}/status/` | Admin | Update referral status |
| GET | `/api/hospitals/` | Doctor, Admin | List referral hospitals |
| POST | `/api/hospitals/` | Admin | Add hospital |

### Notification APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/notifications/` | Authenticated | Get own notifications |
| PATCH | `/api/notifications/{id}/read/` | Authenticated | Mark notification as read |
| PATCH | `/api/notifications/read-all/` | Authenticated | Mark all as read |

### Admin APIs
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| GET | `/api/admin/stats/` | Admin | System-wide statistics |
| GET | `/api/admin/users/` | Admin | List all users |
| POST | `/api/admin/users/` | Admin | Create new user |
| PATCH | `/api/admin/users/{id}/` | Admin | Update user / toggle active |
| GET | `/api/admin/audit-logs/` | Admin | View audit log |
| GET | `/api/admin/screenings/` | Admin | All screenings across centers |

### FastAPI AI Service (Internal — NOT exposed to frontend)
| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/analyze` | Internal (Django only) | Run inference on image |
| GET | `/health` | Internal | Health check, confirms model loaded |

---

## 11. ML Integration Plan

### What Must Remain Unchanged
- `load_model()` — do not modify
- `build_cam()` — do not modify
- `check_fundus_quality()` — do not modify
- `quality_gated_prediction()` — do not modify
- `nain_ai_inference()` — do not modify the LOGIC
- `model/final_best_dr_model.pth` — never touch this file

### What Must Be Wrapped (FastAPI Layer)

Create `ai_service/main.py`:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import io, base64
from PIL import Image
import numpy as np

# Import unchanged ML code
import sys
sys.path.insert(0, "../NAIN_AI_BACKEND_HANDOFF")
from model_loader import load_model, build_cam
from inference.nain_ai_inference import nain_ai_inference

# --- SINGLETON MODEL (loaded ONCE at startup) ---
model_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    model_state["model"] = load_model("../NAIN_AI_BACKEND_HANDOFF/model/final_best_dr_model.pth")
    model_state["cam"] = build_cam(model_state["model"])
    yield
    model_state.clear()

app = FastAPI(lifespan=lifespan)

class AnalyzeRequest(BaseModel):
    image_path: str  # local path or MinIO-downloaded temp path

def numpy_to_base64_png(array: np.ndarray) -> str:
    """Convert NumPy array to base64 PNG string for JSON transport."""
    img = Image.fromarray(array.astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    try:
        result = nain_ai_inference(
            image_path=req.image_path,
            model=model_state["model"],
            device="cpu",
            cam=model_state["cam"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result["status"] == "REJECTED":
        return {
            "status": "REJECTED",
            "quality": result["quality"],
            "message": result.get("message", "Poor quality image")
        }

    # CRITICAL FIX: Convert NumPy arrays → base64 PNG strings
    heatmap_b64 = numpy_to_base64_png(
        (result["heatmap"] * 255).astype(np.uint8)
        if result["heatmap"].max() <= 1.0
        else result["heatmap"]
    )
    overlay_b64 = numpy_to_base64_png(result["overlay"])
    original_b64 = numpy_to_base64_png(result["original_image"])

    return {
        "status": "ACCEPTED",
        "quality": result["quality"],
        "prediction": result["prediction"],
        "class_id": result["class_id"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "heatmap_b64": heatmap_b64,
        "overlay_b64": overlay_b64,
        "original_b64": original_b64,
    }

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "model" in model_state}
```

### Model Loading Strategy

**Load ONCE at FastAPI startup** using the lifespan context. Never call `load_model()` per request. This is correct because:
- EfficientNet-B0 weights are 15.6MB and take ~1-2 seconds to load
- The model is stateless after `.eval()` — safe to share across requests
- Multiple parallel requests can share the same model object (inference is read-only)

### Grad-CAM Output Handling

Pipeline for images:
```
nain_ai_inference() returns NumPy arrays
        ↓
FastAPI converts to PNG bytes (PIL)
        ↓
Option A (MVP): encode as base64, Django decodes and uploads to MinIO
Option B (better): FastAPI uploads directly to MinIO and returns paths
```
For MVP: Option A is simpler. For production: Option B.

### Poor-Quality Image Representation in Backend

When FastAPI returns `{"status": "REJECTED"}`:
1. Django creates `AIAnalysis` record with `status=REJECTED`, `rejection_reason=quality_result['reason']`
2. Updates `FundusImage.quality_status = "POOR"`
3. Updates `Screening.status = "QUALITY_FAILED"`
4. Creates `Notification` to health worker: "Image quality too poor — please recapture"
5. Health worker can upload a new image for the same screening (status resets to PENDING_IMAGE)

---

## 12. Rural Network / Offline Strategy

### MVP Strategy (Practical, Not Over-Engineered)

**Problem:** Upload may fail mid-way due to connectivity drop.

**MVP Solution:**

```
1. Image Upload with Retry
   → Frontend: use fetch with 3 automatic retries (exponential backoff)
   → Show upload progress bar
   → If all retries fail: store image locally in browser IndexedDB
     with screening_id and status = "PENDING_SYNC"

2. Pending Sync Queue
   → On page load, check IndexedDB for pending uploads
   → When connection restored, automatically resume upload
   → Health worker sees "Pending sync: 1 image" badge

3. Screening Status Machine
   → PENDING_IMAGE status means: image not yet uploaded
   → Health worker can safely close browser — status persists in DB
   → Next login, screening shows "PENDING_IMAGE" — continue upload

4. Image Size Optimization
   → Fundus images can be large (>5MB)
   → Frontend: compress to 800×800 before upload if original is >3MB
   → Quality check still works at 800×800 (threshold: 224×224 minimum)

5. Polling Instead of WebSocket
   → After upload, frontend polls GET /api/screenings/{id}/result/ every 5s
   → Max 12 retries (1 minute total) then shows "Processing..."
   → No WebSocket needed for MVP
```

**What NOT to build for MVP:**
- Full offline mode (PWA service worker with offline inference)
- Local SQLite sync
- Peer-to-peer data sync

---

## 13. Security Requirements

### Minimum Practical Requirements for SIH MVP

#### Authentication
- JWT with 1-hour access token + 7-day refresh token
- Refresh token rotation (new refresh token on each use)
- Tokens stored in httpOnly cookies (not localStorage) to prevent XSS

#### Role-Based Access Control
- Every API endpoint enforces role check via DRF permission classes
- Health workers can only see their own health center's data (queryset filtering)
- Doctors can only access cases assigned to them (or unassigned in queue)
- Admin sees everything

#### Password Security
- Minimum 8 characters, must include letter + number
- Django's built-in password validators
- bcrypt hashing (Django default PBKDF2 is acceptable)
- No password reset via email for MVP (admin resets manually)

#### Image Access
- Original images stored in MinIO with bucket set to PRIVATE (no public access)
- Frontend never gets a static image URL
- Every image request goes through Django which generates a pre-signed MinIO URL (15-minute expiry)
- Grad-CAM/overlay images same policy

#### Patient Data Protection
- Patient name is stored but never included in image file paths (use UUID image IDs)
- All API responses filtered by role — health worker never sees other centers' patients
- No patient data in log files

#### Audit Logging
- Every DoctorReview creation → AuditLog entry
- Every Referral creation → AuditLog entry
- Every login attempt (success and failure) → AuditLog entry
- Every patient registration → AuditLog entry

#### Network Security
- HTTPS enforced in production (Nginx with SSL)
- CORS configured to allow only the Next.js frontend domain
- Rate limiting on login endpoint (max 10 attempts per 5 minutes per IP)
- Django SECRET_KEY in environment variable, never in code

---

## 14. Development Roadmap

### PHASE 0 — ML Code Audit and Integration Test
**Goal:** Verify the ML code runs correctly and identify all integration issues.

| Item | Detail |
|------|--------|
| Goal | Confirm existing ML code works; identify the NumPy JSON bug |
| Create | Test script that calls `nain_ai_inference()` and prints result types |
| Technologies | Python, existing ML stack |
| Files | `NAIN_AI_BACKEND_HANDOFF/inference/nain_ai_inference.py` |
| Dependencies | ML environment installed |
| Expected Output | Confirmation that `heatmap`, `overlay`, `original_image` are NumPy arrays |
| Test | `python test_inference.py` prints type info of each key |
| Before Next Phase | Must confirm model loads and inference runs without error |

---

### PHASE 1 — Repository Structure and Environment Setup
**Goal:** Create the monorepo structure, set up virtual environments, Docker Compose skeleton.

| Item | Detail |
|------|--------|
| Goal | Clean project structure that all team members can run |
| Create | Monorepo folder structure, Docker Compose, .env.example, Makefiles |
| Technologies | Docker, Docker Compose, Python venv |
| Files | `docker-compose.yml`, `backend/`, `ai_service/`, `frontend/`, `.env.example` |
| Dependencies | Docker installed |
| Expected Output | `docker-compose up` starts PostgreSQL + MinIO containers |
| Test | `docker-compose ps` shows all services healthy |
| Before Next Phase | All team members can clone and start the dev environment |

**Folder Structure to Create:**
```
nain-ai/
├── backend/              (Django + DRF)
│   ├── config/           (settings, urls, wsgi)
│   ├── apps/
│   │   ├── accounts/     (User, auth)
│   │   ├── patients/     (Patient, HealthCenter)
│   │   ├── screenings/   (Screening, FundusImage)
│   │   ├── ai_results/   (AIAnalysis)
│   │   ├── reviews/      (DoctorReview)
│   │   ├── referrals/    (Referral, Hospital)
│   │   └── notifications/
│   ├── requirements.txt
│   └── Dockerfile
├── ai_service/           (FastAPI)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             (Next.js)
│   └── ...
├── ml/                   (the existing ML code, as-is)
│   └── NAIN_AI_BACKEND_HANDOFF/
├── docker-compose.yml
└── .env.example
```

---

### PHASE 2 — Django Project and Settings
**Goal:** Functional Django project with proper settings.

| Item | Detail |
|------|--------|
| Goal | Django runs with PostgreSQL connected |
| Create | Django project, settings (dev/prod split), database connection |
| Technologies | Django 4.2, psycopg2, python-decouple |
| Files | `backend/config/settings/base.py`, `dev.py`, `backend/manage.py` |
| Dependencies | Phase 1 complete (Postgres running in Docker) |
| Expected Output | `python manage.py migrate` runs successfully |
| Test | `python manage.py check` returns no errors |
| Before Next Phase | Django connects to PostgreSQL, migrations run |

---

### PHASE 3 — Authentication and User Roles
**Goal:** Working JWT auth with HEALTH_WORKER, OPHTHALMOLOGIST, ADMIN roles.

| Item | Detail |
|------|--------|
| Goal | Login endpoint returns JWT, role-based access works |
| Create | Custom User model, role field, JWT setup, login/logout/me endpoints |
| Technologies | Django, DRF, djangorestframework-simplejwt |
| Files | `apps/accounts/models.py`, `serializers.py`, `views.py`, `urls.py` |
| Dependencies | Phase 2 |
| Expected Output | POST /api/auth/login/ returns access + refresh tokens |
| Test | Login as HW, try doctor endpoint → 403. Login as doctor → 200 |
| Before Next Phase | All three roles can authenticate and are rejected from wrong endpoints |

---

### PHASE 4 — Database Models
**Goal:** All database models created with migrations.

| Item | Detail |
|------|--------|
| Goal | All tables exist in PostgreSQL with correct relationships |
| Create | All models from section 9 above (Patient, Screening, etc.) |
| Technologies | Django ORM |
| Files | One `models.py` per app |
| Dependencies | Phase 3 |
| Expected Output | `manage.py migrate` creates all tables |
| Test | Django admin shows all models browsable |
| Before Next Phase | All models created, admin registered, migrations clean |

---

### PHASE 5 — HealthCenter and Patient Management APIs
**Goal:** Health worker can register patients.

| Item | Detail |
|------|--------|
| Goal | CRUD for HealthCenter (admin) and Patient (health worker) |
| Create | Serializers, viewsets, URL routing for patients and health centers |
| Technologies | DRF ModelViewSet, DRF permissions |
| Files | `apps/patients/` serializers + views + urls |
| Dependencies | Phase 4 |
| Expected Output | POST /api/patients/ creates patient linked to HW's health center |
| Test | Login as HW → create patient → GET patient → 200 with correct data |
| Before Next Phase | Patient creation and retrieval working |

---

### PHASE 6 — Screening Creation and Image Upload
**Goal:** Health worker can start a screening and upload a fundus image to MinIO.

| Item | Detail |
|------|--------|
| Goal | Screening created, image uploaded to MinIO, status tracking works |
| Create | Screening CRUD, image upload endpoint, MinIO client wrapper |
| Technologies | DRF, boto3 (MinIO S3 client) |
| Files | `apps/screenings/` models + views, `utils/storage.py` |
| Dependencies | Phase 5, MinIO running |
| Expected Output | POST /api/screenings/{id}/images/upload/ → image stored in MinIO, FundusImage created |
| Test | Upload test image → check MinIO bucket → check DB record |
| Before Next Phase | Images upload successfully to MinIO with correct path |

---

### PHASE 7 — FastAPI AI Service Setup
**Goal:** FastAPI AI service wraps existing ML code, loads model at startup, responds to /analyze.

| Item | Detail |
|------|--------|
| Goal | FastAPI returns JSON inference result (no NumPy arrays) |
| Create | `ai_service/main.py` with lifespan, /analyze endpoint, NumPy→base64 conversion |
| Technologies | FastAPI, uvicorn, existing PyTorch ML code |
| Files | `ai_service/main.py`, `ai_service/requirements.txt`, `ai_service/Dockerfile` |
| Dependencies | Phase 1 (ML environment), existing `model_loader.py` and `nain_ai_inference.py` |
| Expected Output | POST /analyze with image_path → returns JSON with base64 heatmap |
| Test | `curl -X POST /analyze -d '{"image_path":"test.jpg"}'` returns valid JSON |
| Before Next Phase | AI service returns correct JSON result, model loads once |

---

### PHASE 8 — AI Integration in Django + Result Storage
**Goal:** Django calls FastAPI on image upload, stores AIAnalysis result.

| Item | Detail |
|------|--------|
| Goal | Full pipeline: upload → Django calls FastAPI → saves result → Screening status updates |
| Create | `utils/ai_client.py` (httpx calls to FastAPI), AIAnalysis model save logic, priority calculation, base64→PNG→MinIO upload for heatmap/overlay |
| Technologies | httpx, Django, MinIO |
| Files | `apps/ai_results/`, `utils/ai_client.py`, `utils/priority.py` |
| Dependencies | Phase 6, Phase 7 |
| Expected Output | Upload image → wait → GET /api/screenings/{id}/result/ returns AI prediction |
| Test | End-to-end: upload known fundus image → check AIAnalysis in DB |
| Before Next Phase | Full inference pipeline working end-to-end |

---

### PHASE 9 — Doctor Queue
**Goal:** Doctors can view pending cases sorted by priority.

| Item | Detail |
|------|--------|
| Goal | GET /api/doctor/queue/ returns prioritized list of pending cases |
| Create | Queue view with priority ordering, assignment logic (auto-assign or manual) |
| Technologies | DRF, Django ORM |
| Files | `apps/reviews/views.py` (queue endpoint) |
| Dependencies | Phase 8 |
| Expected Output | Doctor sees highest-priority unreviewed cases first |
| Test | Create 3 screenings with different priority levels → doctor queue order is correct |
| Before Next Phase | Queue endpoint returns correctly ordered cases |

---

### PHASE 10 — Doctor Review
**Goal:** Doctor can view full case and submit a review.

| Item | Detail |
|------|--------|
| Goal | Doctor sees original image, Grad-CAM, AI result, submits CONFIRM/MODIFY/REJECT |
| Create | DoctorReview model API, pre-signed URL generation for images, review submission |
| Technologies | DRF, boto3 pre-signed URLs |
| Files | `apps/reviews/`, `utils/storage.py` (presigned URLs) |
| Dependencies | Phase 9 |
| Expected Output | POST /api/reviews/ creates DoctorReview, updates Screening.status = REVIEWED |
| Test | Submit MODIFY review with different grade → check DoctorReview.final_grade in DB |
| Before Next Phase | Review submission works, audit log entry created |

---

### PHASE 11 — Referral Workflow
**Goal:** Doctor creates a referral after review.

| Item | Detail |
|------|--------|
| Goal | Referral created with hospital, urgency, notes — linked to DoctorReview |
| Create | Referral model API, Hospital management, referral status flow |
| Technologies | DRF |
| Files | `apps/referrals/` |
| Dependencies | Phase 10 |
| Expected Output | POST /api/referrals/ creates Referral, health worker sees outcome |
| Test | Create referral → GET screening result → includes referral info |
| Before Next Phase | Full patient→screening→review→referral flow works end-to-end |

---

### PHASE 12 — In-App Notifications
**Goal:** Health workers and doctors receive relevant notifications.

| Item | Detail |
|------|--------|
| Goal | DB-backed notifications for: AI complete, quality fail, review complete, referral created |
| Create | Notification model, API, auto-create notifications at key workflow points |
| Technologies | DRF, Django signals |
| Files | `apps/notifications/` |
| Dependencies | Phase 11 |
| Expected Output | Health worker gets notified when doctor finishes review |
| Test | Complete a review → check GET /api/notifications/ for health worker account |
| Before Next Phase | Key notifications fire correctly |

---

### PHASE 13 — Admin APIs and Analytics
**Goal:** Admin can manage users, centers, and view system statistics.

| Item | Detail |
|------|--------|
| Goal | Admin dashboard API endpoints working |
| Create | Admin serializers, user management, system stats aggregations, audit log API |
| Technologies | DRF, Django ORM aggregates |
| Files | `apps/accounts/admin_views.py`, Django admin registration |
| Dependencies | Phase 12 |
| Expected Output | GET /api/admin/stats/ returns counts of patients, screenings, DR distribution |
| Test | Create test data → stats endpoint reflects correct numbers |
| Before Next Phase | Admin can manage users, view stats |

---

### PHASE 14 — Frontend Development
**Goal:** Build all three dashboards in Next.js.

| Item | Detail |
|------|--------|
| Goal | Functional UIs for Health Worker, Doctor, Admin |
| Create | Next.js project, auth flow, all dashboard pages |
| Technologies | Next.js 14, Tailwind CSS, Recharts (charts), React Query (data fetching) |
| Files | `frontend/` |
| Dependencies | Phases 3–13 (all APIs complete) |
| Expected Output | Full end-to-end demo functional through the browser |
| Test | Run complete scenario: register patient → upload image → doctor reviews → referral created |
| Before Next Phase | All dashboards functional |

---

### PHASE 15 — Testing and Deployment
**Goal:** System is production-ready for SIH demo.

| Item | Detail |
|------|--------|
| Goal | Deployed, tested system accessible via HTTPS |
| Create | Docker Compose production config, Nginx config, SSL, Sentry integration |
| Technologies | Docker, Nginx, Let's Encrypt, Sentry |
| Files | `docker-compose.prod.yml`, `nginx/nginx.conf` |
| Dependencies | Phase 14 |
| Expected Output | System accessible at a public URL, demo scenario runs without errors |
| Test | Full end-to-end scenario on production server with real fundus images |
| Before Next Phase | — (final phase) |

---

## 15. Phase Dependencies

```
PHASE 0 (ML Audit)
    └── PHASE 1 (Repo Setup)
            └── PHASE 2 (Django Project)
                    └── PHASE 3 (Auth + Roles)
                            └── PHASE 4 (DB Models)
                                    └── PHASE 5 (Patient APIs)
                                            └── PHASE 6 (Screening + Image Upload)
                                    └── PHASE 7 (FastAPI AI Service) ← can parallel with Phase 5
                                            └── PHASE 8 (AI Integration) ← needs Phase 6 + 7
                                                    └── PHASE 9 (Doctor Queue)
                                                            └── PHASE 10 (Doctor Review)
                                                                    └── PHASE 11 (Referral)
                                                                            └── PHASE 12 (Notifications)
                                                                                    └── PHASE 13 (Admin)
                                                                                            └── PHASE 14 (Frontend)
                                                                                                    └── PHASE 15 (Deploy)
```

**Parallelism opportunity:** Phases 5 and 7 can be developed simultaneously by different team members (Patient APIs by one developer, FastAPI AI service by ML developer).

---

## 16. Risks and Missing Pieces

| Risk | Severity | Mitigation |
|------|----------|-----------|
| NumPy arrays not JSON-serializable | 🔴 CRITICAL | Must fix in Phase 7 before any API work |
| No authentication system | 🔴 HIGH | Phase 3 must be done early |
| Model takes >10s inference on CPU | 🟡 MEDIUM | Test on target hardware; add Celery if needed |
| Image upload fails on rural network | 🟡 MEDIUM | Frontend retry + IndexedDB pending queue |
| MinIO not set up → images lost | 🟡 MEDIUM | Use local filesystem FileField as fallback for dev |
| requirements.txt has no versions → dependency conflicts | 🟡 MEDIUM | Pin all versions before Phase 1 |
| `python-multipart` in requirements is FastAPI dep, not Django | 🟠 LOW | Clean up requirements.txt |
| No versioning of ML model | 🟠 LOW | Add `model_version` field to AIAnalysis |
| Single doctor per case → bottleneck | 🟠 LOW | Design assignment to allow manual reassignment |
| No email/SMS for demo scenario | 🟠 LOW | In-app notifications sufficient for SIH demo |

---

## 17. What NOT to Build Yet

The following are explicitly out of scope for the MVP:

| Feature | Why Not Now |
|---------|-------------|
| Patient mobile app / patient login | Patients don't operate the system |
| WhatsApp / SMS notifications | In-app notifications sufficient for demo |
| Celery async task queue | Synchronous inference is fine for demo scale |
| Full offline PWA mode | Over-engineering for SIH |
| Multiple ML models / model A/B testing | One model is working and sufficient |
| DICOM image format support | Fundus cameras also export JPEG/PNG |
| WebSocket real-time updates | Polling every 5 seconds is sufficient |
| Multi-language support (Hindi/vernacular) | Deferred to post-SIH |
| Automated referral (no doctor review) | Doctor must remain in the loop |
| EHR/EMR integration | Not needed for SIH prototype |
| PDF report generation | Nice-to-have, not critical |
| Model retraining pipeline | ML team handles this separately |

---

## 18. FIRST TASK TO START TODAY

> **Fix the NumPy serialization bug and verify the ML pipeline produces a fully JSON-serializable result.**

### Why This Must Come First

Every subsequent task — FastAPI wrapper, Django integration, image storage, API responses — depends on being able to pass ML results as JSON. If you build the FastAPI service without fixing this, it will crash on the first inference call with `TypeError: Object of type ndarray is not JSON serializable`. This bug blocks everything downstream.

---

### FIRST TASK

```
TASK: Write an integration test for nain_ai_inference() and prove it returns JSON-serializable output

Goal:
  Run nain_ai_inference() on a test fundus image.
  Inspect the types of all returned values.
  Write and test the NumPy → base64 PNG conversion function.
  Confirm the fully converted result passes json.dumps() without error.

Files involved:
  NAIN_AI_BACKEND_HANDOFF/inference/nain_ai_inference.py  (read-only)
  NAIN_AI_BACKEND_HANDOFF/model_loader.py                 (read-only)
  test_inference_json.py                                  (create this)

Commands to run:
  cd d:\Nain_Ai
  python -m venv venv
  venv\Scripts\activate
  pip install torch torchvision opencv-python pillow numpy grad-cam
  python test_inference_json.py

Expected result:
  Script prints the type of each key in the result dict.
  Confirms heatmap, overlay, original_image are numpy.ndarray.
  Converts all three to base64 PNG strings.
  Calls json.dumps(result) successfully with no TypeError.
  Prints "ALL CHECKS PASSED — result is fully JSON-serializable"

How to verify:
  The script exits with code 0.
  json.dumps() does not raise TypeError.
  The base64 strings can be decoded back to a valid PNG image.
```

---

*Audit performed by inspection of:*
- `d:\Nain_Ai\NAIN_AI_BACKEND_HANDOFF\model_loader.py` (19 lines)
- `d:\Nain_Ai\NAIN_AI_BACKEND_HANDOFF\inference\nain_ai_inference.py` (300 lines)
- `d:\Nain_Ai\NAIN_AI_BACKEND_HANDOFF\requirements.txt` (9 lines)
- `d:\Nain_Ai\NAIN_AI_BACKEND_HANDOFF\README.md` (59 lines)
- `d:\Nain_Ai\README.md` (15 lines)
- `d:\Nain_Ai\NAIN_AI_BACKEND_HANDOFF\model\final_best_dr_model.pth` (15.6 MB — existence confirmed)
