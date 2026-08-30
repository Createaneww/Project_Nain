# Diabetic Retinopathy Screening System

A role-based backend system for diabetic retinopathy (DR) screening. It supports fundus image upload, ML-based analysis, automated report generation, doctor review, and end-to-end referral management.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [User Roles & Permissions](#user-roles--permissions)
- [Getting Started](#getting-started)
- [Core Workflow](#core-workflow)
  - [1. Patient Creation](#1-patient-creation)
  - [2. Screening Creation](#2-screening-creation)
  - [3. Fundus Image Upload](#3-fundus-image-upload)
  - [4. ML Analysis](#4-ml-analysis)
  - [5. Image Quality Analysis](#5-image-quality-analysis)
  - [6. Report Generation](#6-report-generation)
  - [7. Referral Management](#7-referral-management)
  - [8. Admin Assigns Doctor](#8-admin-assigns-doctor)
  - [9. Doctor Review](#9-doctor-review)
  - [10. Health Worker Collection](#10-health-worker-collection)
- [Dashboards](#dashboards)
- [Admin User Management](#admin-user-management)
- [Search, Filters & Analytics](#search-filters--analytics)
- [Reports API](#reports-api)
- [Authentication & Authorization](#authentication--authorization)
- [API Reference](#api-reference)
- [End-to-End Testing](#end-to-end-testing)
- [Project Status](#project-status)
- [Roadmap](#roadmap)

---

## Project Overview

This project implements an end-to-end backend workflow for diabetic retinopathy screening:

1. Health Worker creates a patient
2. Health Worker creates a screening
3. Fundus image is uploaded
4. Django backend sends the image to the ML server for analysis
5. ML server returns prediction and image quality results
6. A report is generated automatically
7. A referral is created
8. Admin assigns a doctor
9. Doctor reviews the referral and adds notes
10. Health Worker collects the reviewed result

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python |
| Web Framework | Django |
| API Layer | Django REST Framework |
| Database | SQLite (Django ORM) |
| Auth | JWT Authentication |
| ML Service | Separate ML server (port `8001`) |

---

## System Architecture

```
Health Worker
     │
     ▼
Create Patient
     │
     ▼
Create Screening
     │
     ▼
Upload Fundus Image
     │
     ▼
Django Backend
     │
     ▼
ML Server
     │
     ├── Image Quality Analysis
     ├── DR Prediction
     ├── Confidence
     ├── Probabilities
     ├── Retinal Analysis
     └── Grad-CAM
     │
     ▼
Generate Report
     │
     ▼
Create Referral
     │
     ▼
Admin Assigns Doctor
     │
     ▼
Doctor Review
     │
     ▼
Health Worker Collection
```

---

## User Roles & Permissions

The system supports three roles, enforced via role-based access control.

### ADMIN
- Access Admin Dashboard
- View system statistics
- Create, view, and update users
- Activate/deactivate users
- Assign doctors to referrals

### DOCTOR
- Access Doctor Dashboard
- View assigned referrals
- Review assigned referrals
- Add doctor notes
- Complete referral review

### HEALTH_WORKER
- Access Health Worker Dashboard
- Create patients
- Create screenings
- Upload fundus images
- Trigger ML analysis
- View generated reports
- View referrals
- Collect reviewed referrals

---

## Getting Started

### Prerequisites
- Python 3.x
- pip
- A running ML server on port `8001`

### Django Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the Django server
python manage.py runserver
```

The backend will be available at:

```
http://127.0.0.1:8000
```

### ML Server

The ML server must be started separately and must be running before calling the `analyze` endpoint.

```
http://127.0.0.1:8001
```

> **Note:** Ensure the ML server is up before triggering `POST /api/screenings/<id>/analyze/`, or the request will fail.

---

## Core Workflow

### 1. Patient Creation

Health Worker creates a patient record.

**Endpoint**
```http
POST /api/patients/
```

**Example Request**
```json
{
    "full_name": "E2E Test Patient",
    "age": 55,
    "gender": "MALE"
}
```

### 2. Screening Creation

A screening is created for an existing patient.

**Endpoint**
```http
POST /api/screenings/
```

**Example Request**
```json
{
    "patient": 3
}
```

Initial status after creation:
```
CREATED
```

### 3. Fundus Image Upload

Upload the patient's fundus image to a screening.

**Endpoint**
```http
POST /api/screenings/<screening_id>/upload/
```

**Content-Type**
```
multipart/form-data
```

**Form Field**
```
fundus_image
```

Status after successful upload:
```
IMAGE_UPLOADED
```

**Example Response**
```json
{
    "id": 5,
    "patient": 3,
    "patient_name": "E2E Test Patient",
    "fundus_image": "/media/fundus_images/image.jpg",
    "status": "IMAGE_UPLOADED"
}
```

### 4. ML Analysis

Triggers ML-based analysis of the uploaded fundus image.

**Endpoint**
```http
POST /api/screenings/<screening_id>/analyze/
```

The Django backend communicates with the ML server at `http://127.0.0.1:8001` to perform:

- **Image quality checks:** resolution, brightness, contrast, sharpness, coverage, fundus detection, cropping
- **DR prediction:** classification and confidence scoring
- **Class probabilities**
- **Retinal analysis**
- **Grad-CAM** result generation

**Example Response**
```json
{
    "prediction": "No DR",
    "confidence": 0.5764517188072205
}
```

**Possible Prediction Classes**
- No DR
- Mild
- Moderate
- Severe
- Proliferative

### 5. Image Quality Analysis

The ML response includes detailed image quality metrics.

**Example**
```json
{
    "quality": {
        "overall": "GOOD",
        "passed_checks": 7,
        "resolution_pass": true,
        "brightness_pass": true,
        "contrast_pass": true,
        "sharpness_pass": true,
        "coverage_pass": true,
        "fundus_pass": true,
        "cropping_pass": true
    }
}
```

Additional measurements returned:
- Brightness
- Contrast
- Sharpness
- Retinal ratio
- Colorful ratio
- Border touch ratio

### 6. Report Generation

A report is generated automatically after successful ML analysis.

**Endpoint**
```http
GET /api/screenings/<screening_id>/report/
```

**Report Contents**
- Screening ID
- Patient name
- Prediction
- Confidence
- Quality data
- Class probabilities
- Retinal analysis
- Original image URL
- Grad-CAM image URL
- Generated timestamp

**Example Response**
```json
{
    "id": 3,
    "screening_id": 5,
    "patient_name": "E2E Test Patient",
    "prediction": "No DR",
    "confidence": 0.5764517188072205,
    "quality_data": {},
    "probabilities": {},
    "retinal_analysis": {},
    "original_image_url": "/results/original.jpg",
    "gradcam_url": "/results/overlay.jpg"
}
```

### 7. Referral Management

A referral is automatically created as part of the screening/report workflow.

**Referral Status Flow**
```
PENDING → ASSIGNED → REVIEWED → COLLECTED
```

**Referral Data Includes**
- Report ID
- Screening ID
- Patient ID / name
- Prediction
- Assigned doctor
- Referral status
- Doctor notes
- Review timestamp
- Collection timestamp
- Collected by

**Example Response**
```json
{
    "id": 2,
    "report_id": 3,
    "screening_id": 5,
    "patient_id": 3,
    "patient_name": "E2E Test Patient",
    "prediction": "No DR",
    "assigned_doctor": null,
    "status": "PENDING"
}
```

### 8. Admin Assigns Doctor

Admin assigns a doctor to a pending referral.

**Endpoint**
```http
PATCH /api/referrals/<referral_id>/assign-doctor/
```

**Example Request**
```json
{
    "doctor_id": 3
}
```

Status transition: `PENDING → ASSIGNED`

**Example Response**
```json
{
    "id": 2,
    "assigned_doctor": 3,
    "assigned_doctor_name": "drtanisha",
    "status": "ASSIGNED"
}
```

### 9. Doctor Review

The assigned doctor reviews the referral and adds clinical notes.

**Endpoint**
```http
PATCH /api/referrals/<referral_id>/review/
```

**Example Request**
```json
{
    "doctor_notes": "Patient reviewed successfully. No diabetic retinopathy detected. Routine follow-up recommended."
}
```

Status transition: `ASSIGNED → REVIEWED`

The response includes doctor notes, reviewed timestamp, and the updated referral status.

### 10. Health Worker Collection

The Health Worker collects the result after doctor review.

Status transition: `REVIEWED → COLLECTED`

**Stored fields:** `collected_at`, `collected_by`, `collected_by_name`

**Example Response**
```json
{
    "status": "COLLECTED",
    "collected_by": 2,
    "collected_by_name": "Manvar"
}
```

---

## Dashboards

### Admin Dashboard

```http
GET /api/dashboard/admin/
```

Provides system-wide statistics: total users (by role), patients, screenings, reports, and referrals (pending, assigned, reviewed, collected).

**Example**
```json
{
    "users": {
        "total": 4,
        "admins": 1,
        "doctors": 1,
        "health_workers": 2
    },
    "patients": {
        "total": 2
    },
    "screenings": {
        "total": 4
    },
    "reports": {
        "total": 2
    },
    "referrals": {
        "total": 1,
        "pending": 0,
        "assigned": 0,
        "reviewed": 0,
        "collected": 1
    }
}
```

### Doctor Dashboard

```http
GET /api/dashboard/doctor/
```

Provides doctor-specific statistics: doctor info, total/assigned/reviewed/collected referrals — scoped to the authenticated doctor only.

### Health Worker Dashboard

```http
GET /api/dashboard/health-worker/
```

Provides Health Worker-specific statistics: worker info, total screenings created, screenings created today, and total referrals collected by that worker. Connected to the full screening workflow (image upload + ML analysis).

---

## Admin User Management

**List and Create Users**
```http
GET  /api/admin/users/
POST /api/admin/users/
```

**Retrieve and Update User**
```http
GET   /api/admin/users/<id>/
PATCH /api/admin/users/<id>/
```

**Example Update**
```json
{
    "full_name": "Updated Test Doctor",
    "is_active": true
}
```

Admin can manage: username, full name, first/last name, email, role, active status, and password (on create/update, as supported by the API).

---

## Search, Filters & Analytics

Search, filtering, and analytics have been implemented and tested across the following modules:

- Patients
- Screenings
- Reports
- Referrals

Analytics provide aggregated system data for monitoring the overall workflow.

---

## Reports API

```http
GET /api/reports/                # List reports
GET /api/reports/<id>/           # Report detail
GET /api/reports/<id>/print/     # Printable report
```

---

## Authentication & Authorization

All protected endpoints require authentication and enforce role-based access.

**Permission classes used:**
- `IsAuthenticated`
- `HasRole`

**Role-based restrictions:**

| Endpoint | Allowed Role(s) |
|---|---|
| Admin Dashboard | `ADMIN` |
| Doctor Dashboard | `DOCTOR` |
| Health Worker Dashboard | `HEALTH_WORKER` |
| User Management | `ADMIN` |
| Doctor Review | Assigned `DOCTOR` only |

---

## API Reference

**Base structure:**
```
/api/auth/
/api/admin/
/api/patients/
/api/screenings/
/api/reports/
/api/referrals/
/api/dashboard/
```

**Full endpoint list:**

```
POST   /api/patients/

POST   /api/screenings/
GET    /api/screenings/
GET    /api/screenings/<id>/
POST   /api/screenings/<id>/upload/
POST   /api/screenings/<id>/analyze/
GET    /api/screenings/<id>/report/

GET    /api/reports/
GET    /api/reports/<id>/
GET    /api/reports/<id>/print/

GET    /api/referrals/
PATCH  /api/referrals/<id>/assign-doctor/
PATCH  /api/referrals/<id>/review/
PATCH  /api/referrals/<id>/collect/

GET    /api/dashboard/admin/
GET    /api/dashboard/doctor/
GET    /api/dashboard/health-worker/

GET    /api/admin/users/
POST   /api/admin/users/
GET    /api/admin/users/<id>/
PATCH  /api/admin/users/<id>/
```

---

## End-to-End Testing

The following complete workflow has been tested successfully:

```
Create Patient
      ↓
Create Screening
      ↓
Upload Fundus Image
      ↓
ML Analysis
      ↓
Report Generated
      ↓
Referral Created
      ↓
Admin Assigns Doctor
      ↓
Doctor Reviews Referral
      ↓
Health Worker Collects Result
```

**Verified screening status transitions:**
```
CREATED → IMAGE_UPLOADED → COMPLETED
```

**Verified referral status transitions:**
```
PENDING → ASSIGNED → REVIEWED → COLLECTED
```

---

## Project Status

### ✅ Completed

- Authentication and role-based access
- Patient management
- Screening creation
- Fundus image upload
- ML server integration
- Image quality analysis
- DR prediction
- Confidence and probability results
- Retinal analysis
- Grad-CAM result support
- Automatic report generation
- Report APIs
- Referral creation and management
- Admin doctor assignment
- Doctor referral review
- Health Worker referral collection
- Admin Dashboard
- Doctor Dashboard
- Health Worker Dashboard
- Admin user management
- Search / filters / analytics
- End-to-end API testing

### 🚧 Pending / Future Work

- Frontend implementation
- UI integration with all backend APIs
- Final frontend-to-backend end-to-end testing
- Production deployment configuration
- Production security and environment configuration

---

## Roadmap

```
Backend & Core Workflow  ✅  Completed
        │
        ▼
Frontend Development      →  In Progress / Planned
        │
        ▼
Frontend–Backend Integration
        │
        ▼
Final Full System Testing
        │
        ▼
Deployment
```

**Current status:** Backend development and the core end-to-end workflow are complete and tested. Remaining work is focused on frontend development, integration, full-system testing, and deployment.
