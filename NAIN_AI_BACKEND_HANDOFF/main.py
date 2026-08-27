# pyrefly: ignore [missing-import]
import cv2
import os
import uuid
import shutil
import numpy as np

from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles

from model_loader import load_model, build_cam
from inference.nain_ai_inference import nain_ai_inference

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png"
}
ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png"
}
MAX_FILE_SIZE = 10 * 1024 * 1024


model = None
cam = None
device = "cpu"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, cam

    print("Loading NAIN AI model...")

    model = load_model(device=device)
    cam = build_cam(model)

    print("NAIN AI model loaded successfully!")

    yield

    print("Shutting down NAIN AI service...")


app = FastAPI(
    title="NAIN AI Service",
    lifespan=lifespan
)


app.mount(
    "/results",
    StaticFiles(directory="results"),
    name="results"
)


@app.get("/")
def home():
    return {
        "message": "NAIN AI FastAPI is running",
        "model_loaded": model is not None
    }


def make_json_safe(data):

    if isinstance(data, dict):
        return {
            key: make_json_safe(value)
            for key, value in data.items()
        }

    if isinstance(data, list):
        return [
            make_json_safe(item)
            for item in data
        ]

    if isinstance(data, np.ndarray):
        return data.tolist()

    if isinstance(data, np.integer):
        return int(data)

    if isinstance(data, np.floating):
        return float(data)

    if isinstance(data, np.bool_):
        return bool(data)

    return data


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):

    # 1. Content type validation
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG image files are allowed."
        )

    # 2. File extension validation
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only .jpg, .jpeg and .png file extensions are allowed."
        )

    # 3. Read uploaded file and validate size
    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size must not exceed 10 MB."
        )

    # 4. Unique temporary filename
    file_path = f"temp_{uuid.uuid4()}{file_extension}"

    try:
        # 5. Save uploaded image temporarily
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)

        # 6. Run existing ML pipeline
   
        try:
            result = nain_ai_inference(
                image_path=file_path,
                model=model,
                device=device,
                cam=cam
            )

        except Exception as e:
            print(f"ML inference error: {str(e)}")

            raise HTTPException(
                status_code=500,
                detail="An error occurred while analyzing the image."
    )

        # Poor quality image
        if result["status"] == "REJECTED":
            return make_json_safe(result)

        # 7. Unique ID for this analysis
        image_id = str(uuid.uuid4())

        # 8. Save original uploaded fundus image permanently
        original_extension = os.path.splitext(file.filename)[1].lower()

        if not original_extension:
            original_extension = ".jpg"

        original_filename = (
            f"{image_id}_original{original_extension}"
        )

        original_path = (
            f"results/{original_filename}"
        )

        shutil.copy2(
            file_path,
            original_path
        )

        # 9. Save Grad-CAM overlay
        overlay_filename = (
            f"{image_id}_overlay.jpg"
        )

        overlay_path = (
            f"results/{overlay_filename}"
        )

        overlay_bgr = cv2.cvtColor(
            result["overlay"],
            cv2.COLOR_RGB2BGR
        )

        cv2.imwrite(
            overlay_path,
            overlay_bgr
        )

        # 10. Remove raw NumPy arrays from API response
        result.pop("heatmap", None)
        result.pop("overlay", None)
        result.pop("original_image", None)

        # 11. Add image URLs
        result["original_image_url"] = (
            f"/results/{original_filename}"
        )

        result["gradcam_url"] = (
            f"/results/{overlay_filename}"
        )

        # 12. Return JSON-safe response
        return make_json_safe(result)

    finally:
        # Always delete temporary uploaded image
        if os.path.exists(file_path):
            os.remove(file_path)