# # pyrefly: ignore [missing-import]
# import cv2
# import numpy as np
# import torch
# from PIL import Image
# from torchvision import transforms
# from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
# from pytorch_grad_cam.utils.image import show_cam_on_image


# CLASS_NAMES = [
#     "No DR",
#     "Mild",
#     "Moderate",
#     "Severe",
#     "Proliferative"
# ]




# RETINAL_FEATURE_MAPPING = {
#     0: {
#         "stage": "No DR",
#         "features": [
#             "No characteristic DR lesions"
#         ]
#     },

#     1: {
#         "stage": "Mild NPDR",
#         "features": [
#             "Microaneurysms"
#         ]
#     },

#     2: {
#         "stage": "Moderate NPDR",
#         "features": [
#             "Exudates",
#             "Hemorrhages",
#             "Cotton Wool Spots"
#         ]
#     },

#     3: {
#         "stage": "Severe NPDR",
#         "features": [
#             "Hemorrhages",
#             "IRMA",
#             "Retinal Ischemia / Ghost Vessels"
#         ]
#     },

#     4: {
#         "stage": "Proliferative DR",
#         "features": [
#             "Neovascularization"
#         ]
#     }
# }

# print("Retinal feature mapping restored!")


# def retinal_analysis(predicted_class):

#     analysis = RETINAL_FEATURE_MAPPING.get(
#         predicted_class,
#         {
#             "stage": "Unknown",
#             "features": []
#         }
#     )

#     return {
#         "stage": analysis["stage"],
#         "features": analysis["features"]
#     }


# print("Retinal Analysis function ready!")


# def check_fundus_quality(image_path):

#     image = cv2.imread(image_path)

#     if image is None:
#         return {
#             "overall": "POOR",
#             "passed_checks": 0,
#             "reason": "Image could not be read"
#         }

#     h, w = image.shape[:2]

#     resolution_pass = (w >= 224 and h >= 224)

#     gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
#     hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

#     brightness = float(np.mean(gray))
#     brightness_pass = 20 <= brightness <= 235

#     contrast = float(np.std(gray))
#     contrast_pass = contrast >= 15

#     sharpness = float(
#         cv2.Laplacian(
#             gray,
#             cv2.CV_64F
#         ).var()
#     )
#     sharpness_pass = sharpness >= 3

#     dark_ratio = float(np.mean(gray < 20))
#     retinal_ratio = 1 - dark_ratio

#     coverage_pass = (
#         0.45 <= retinal_ratio <= 1.0
#     )

#     saturation = hsv[:, :, 1]

#     colorful_ratio = float(
#         np.mean(saturation > 20)
#     )

#     fundus_pass = (
#         colorful_ratio >= 0.20
#         and retinal_ratio >= 0.45
#     )

#     border_width = max(
#         1,
#         int(min(h, w) * 0.02)
#     )

#     top = gray[:border_width, :]
#     bottom = gray[-border_width:, :]
#     left = gray[:, :border_width]
#     right = gray[:, -border_width:]

#     border_threshold = 20

#     border_touch_ratio = np.mean([
#         np.mean(top > border_threshold),
#         np.mean(bottom > border_threshold),
#         np.mean(left > border_threshold),
#         np.mean(right > border_threshold)
#     ])

#     cropping_pass = border_touch_ratio < 0.75

#     checks = [
#         resolution_pass,
#         brightness_pass,
#         contrast_pass,
#         sharpness_pass,
#         coverage_pass,
#         fundus_pass,
#         cropping_pass
#     ]

#     passed_checks = sum(checks)

#     critical_pass = (
#         sharpness_pass
#         and coverage_pass
#         and fundus_pass
#     )

#     if passed_checks == 7 and critical_pass:
#         overall = "GOOD"

#     elif passed_checks >= 5 and critical_pass:
#         overall = "BORDERLINE"

#     else:
#         overall = "POOR"

#     return {
#         "overall": overall,
#         "passed_checks": passed_checks,
#         "resolution_pass": resolution_pass,
#         "brightness_pass": brightness_pass,
#         "contrast_pass": contrast_pass,
#         "sharpness_pass": sharpness_pass,
#         "coverage_pass": coverage_pass,
#         "fundus_pass": fundus_pass,
#         "cropping_pass": cropping_pass,
#         "brightness": brightness,
#         "contrast": contrast,
#         "sharpness": sharpness,
#         "retinal_ratio": retinal_ratio,
#         "colorful_ratio": colorful_ratio,
#         "border_touch_ratio": border_touch_ratio
#     }


# def quality_gated_prediction(
#     image_path,
#     model,
#     device
# ):

#     quality_result = check_fundus_quality(
#         image_path
#     )

#     if quality_result["overall"] == "POOR":

#         return {
#             "status": "REJECTED",
#             "message": (
#                 "Image quality is unclear. "
#                 "Please upload a clearer image."
#             ),
#             "quality": quality_result
#         }

#     image = Image.open(
#         image_path
#     ).convert("RGB")

#     resized = image.resize((224, 224))

#     image_tensor = transforms.ToTensor()(
#         resized
#     ).unsqueeze(0).to(device)

#     model.eval()

#     with torch.no_grad():

#         outputs = model(
#             image_tensor
#         )

#         probabilities = torch.softmax(
#             outputs,
#             dim=1
#         )

#         confidence, prediction = torch.max(
#             probabilities,
#             dim=1
#         )

#     predicted_class = prediction.item()

#     return {
#         "status": "ACCEPTED",
#         "quality": quality_result,
#         "prediction": CLASS_NAMES[predicted_class],
#         "class_id": predicted_class,
#         "confidence": float(
#             confidence.item()
#         ),
#         "probabilities": {
#             CLASS_NAMES[i]: float(
#                 probabilities[0][i].item()
#             )
#             for i in range(5)
#         }
#     }


# def nain_ai_inference(
#     image_path,
#     model,
#     device,
#     cam
# ):

#     quality_result = check_fundus_quality(
#         image_path
#     )

#     if quality_result["overall"] == "POOR":

#         return {
#             "status": "REJECTED",
#             "message": (
#                 "Image quality is unclear. "
#                 "Please upload a clearer image."
#             ),
#             "quality": quality_result
#         }

#     original_image = Image.open(
#         image_path
#     ).convert("RGB")

#     input_image = original_image.resize(
#         (224, 224)
#     )

#     input_tensor = transforms.ToTensor()(
#         input_image
#     ).unsqueeze(0).to(device)

#     model.eval()

#     with torch.no_grad():

#         outputs = model(
#             input_tensor
#         )

#         probabilities = torch.softmax(
#             outputs,
#             dim=1
#         )

#         confidence, prediction = torch.max(
#             probabilities,
#             dim=1
#         )

#     predicted_class = prediction.item()

#     retinal_result = retinal_analysis(
#         predicted_class
#     )

#     targets = [
#         ClassifierOutputTarget(
#             predicted_class
#         )
#     ]

#     grayscale_cam = cam(
#         input_tensor=input_tensor,
#         targets=targets
#     )[0]

#     rgb_image = np.array(
#         input_image
#     ).astype(np.float32) / 255.0

#     visualization = show_cam_on_image(
#         rgb_image,
#         grayscale_cam,
#         use_rgb=True
#     )

#     return {
#         "status": "ACCEPTED",
#         "quality": quality_result,
#         "prediction": CLASS_NAMES[predicted_class],
#         "class_id": predicted_class,
#         "confidence": float(
#             confidence.item()
#         ),
#         "probabilities": {
#             CLASS_NAMES[i]: float(
#                 probabilities[0][i].item()
#             )
#             for i in range(5)
#         },
#         "retinal_analysis": retinal_result,
#         "heatmap": grayscale_cam,
#         "overlay": visualization,
#         "original_image": np.array(
#             input_image
#         )
#     }

# pyrefly: ignore [missing-import]
import cv2
import numpy as np
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
from PIL import Image
# pyrefly: ignore [missing-import]
from torchvision import transforms
# pyrefly: ignore [missing-import]
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
# pyrefly: ignore [missing-import]
from pytorch_grad_cam.utils.image import show_cam_on_image

CLASS_NAMES = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative']
STAGE_NAMES = {0: 'No DR', 1: 'Mild NPDR', 2: 'Moderate NPDR', 3: 'Severe NPDR', 4: 'Proliferative DR'}
INFERENCE_TRANSFORM = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor()])

def detect_retinal_lesions(image_path, resize_dim=512, dark_delta=18, bright_delta=28, min_area=5, min_bright_area=10):
    """Classical image-processing lesion candidate detector.

    APPROACH: local background subtraction. A large median blur estimates
    the smooth local background (it naturally erases small lesions while
    keeping overall shading/texture), then we compare each pixel to ITS
    OWN local neighborhood's background instead of a single fixed
    threshold. This matters because normal fundus texture (choroidal
    pattern, pigmentation mottling) varies a lot between images and even
    across one image -- a fixed absolute threshold flags that normal
    texture as "lesions" everywhere. Comparing against a local background
    instead only flags genuine, localized bright/dark spots.

    dark_delta / bright_delta: how many intensity levels (0-255 scale)
    a spot must differ from its local background to count as a candidate.
    These are tunable -- calibrate by checking a known Grade-0 (No DR)
    image gives near-zero counts, and a Grade-4 image still shows some.

    IMPORTANT LIMITATION: APTOS has no pixel-level lesion annotations, so
    this cannot be trained/validated as a supervised detector. Treat
    these as CANDIDATE regions for a clinician/researcher to look at, not
    a clinically validated diagnosis of individual lesions.
    """

    image = cv2.imread(image_path)
    if image is None:
        return {"error": "Image could not be read"}

    image = cv2.resize(image, (resize_dim, resize_dim))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    green = image[:, :, 1]

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    green_eq = clahe.apply(green)

    # Retina mask: exclude the black background outside the fundus circle,
    # and erode inward a bit so we don't pick up the bright rim edge.
    _, retina_mask = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
    retina_mask = cv2.morphologyEx(retina_mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    retina_mask = cv2.erode(retina_mask, np.ones((15, 15), np.uint8))

    # Optic disc: the single largest very-bright blob. Excluded from lesion
    # search because it's naturally bright and would otherwise be
    # misdetected as a hard exudate.
    _, bright_thresh = cv2.threshold(green_eq, 200, 255, cv2.THRESH_BINARY)
    bright_thresh = cv2.bitwise_and(bright_thresh, retina_mask)
    contours, _ = cv2.findContours(bright_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    optic_disc_mask = np.zeros_like(gray)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) > 200:
            cv2.drawContours(optic_disc_mask, [largest], -1, 255, -1)
            optic_disc_mask = cv2.dilate(optic_disc_mask, np.ones((25, 25), np.uint8))
    exclude_disc = cv2.bitwise_not(optic_disc_mask)
    valid_mask = cv2.bitwise_and(retina_mask, exclude_disc)

    # Local background: median blur erases small lesions, keeps the
    # slowly-varying overall shading/texture of the retina.
    local_background = cv2.medianBlur(green_eq, 31)
    diff = green_eq.astype(np.int16) - local_background.astype(np.int16)

    # --- Dark lesions: microaneurysms (small) + hemorrhages (larger) ---
    dark_map = np.where(diff <= -dark_delta, 255, 0).astype(np.uint8)
    dark_map = cv2.bitwise_and(dark_map, valid_mask)

    microaneurysms, hemorrhages = [], []
    dark_contours, _ = cv2.findContours(dark_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in dark_contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        perimeter = cv2.arcLength(c, True)
        circularity = 4 * np.pi * area / (perimeter ** 2) if perimeter > 0 else 0
        if circularity < 0.35:  # filters out thin vessel fragments, keeps round blobs
            continue
        (x, y), radius = cv2.minEnclosingCircle(c)
        entry = {"x": int(x), "y": int(y), "radius": round(radius, 1), "area": round(area, 1)}
        if area <= 15:
            microaneurysms.append(entry)
        elif area <= 400:
            hemorrhages.append(entry)

    # --- Bright lesions: hard exudates (sharp) + cotton wool spots (fluffy) ---
    # Vessels create a sharp dark-to-bright transition at their edges, which
    # the local-background-subtraction method mistakes for small bright
    # lesions. Build a "near-vessel" exclusion zone (dilated dark/vessel
    # regions, before the circularity filter removes the elongated ones)
    # and keep bright candidates out of it.
    vessel_zone = cv2.dilate(dark_map, np.ones((9, 9), np.uint8))

    bright_map = np.where(diff >= bright_delta, 255, 0).astype(np.uint8)
    bright_map = cv2.bitwise_and(bright_map, valid_mask)
    bright_map = cv2.bitwise_and(bright_map, cv2.bitwise_not(vessel_zone))

    hard_exudates, cotton_wool_spots = [], []
    bright_contours, _ = cv2.findContours(bright_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in bright_contours:
        area = cv2.contourArea(c)
        if area < min_bright_area:
            continue
        x0, y0, w, h = cv2.boundingRect(c)
        aspect_ratio = max(w, h) / max(1, min(w, h))
        if aspect_ratio > 4:  # filters out thin specular reflections along vessels
            continue
        (x, y), radius = cv2.minEnclosingCircle(c)
        roi = green_eq[y0:y0 + h, x0:x0 + w]
        sharpness = cv2.Laplacian(roi, cv2.CV_64F).var() if roi.size else 0
        entry = {"x": int(x), "y": int(y), "radius": round(radius, 1), "area": round(area, 1)}
        if area >= 150 and sharpness < 500:
            cotton_wool_spots.append(entry)
        else:
            hard_exudates.append(entry)

    return {
        "microaneurysms": {"count": len(microaneurysms), "locations": microaneurysms},
        "hemorrhages": {"count": len(hemorrhages), "locations": hemorrhages},
        "hard_exudates": {"count": len(hard_exudates), "locations": hard_exudates},
        "cotton_wool_spots": {"count": len(cotton_wool_spots), "locations": cotton_wool_spots},
        "neovascularization": {
            "note": "Not detected -- requires a trained vessel-segmentation model, not implemented here."
        },
        "method": "classical_cv_local_background_subtraction",
        "disclaimer": (
            "Candidate regions from classical image processing (local background "
            "subtraction), not a clinically validated lesion detector. APTOS has no "
            "pixel-level lesion ground truth to train/validate against."
        ),
    }


def check_fundus_authenticity(image_path):
    """Rejects images that are not plausibly a retinal fundus photo at all
    (moon photos, random pictures, etc.) before spending any time on the
    finer-grained quality checks or the model.

    Uses a WEIGHTED score instead of requiring all 3 checks to pass, because
    requiring all 3 (AND logic) was rejecting ~28% of genuine fundus images
    in validation -- mainly because circular_fov (Hough Circle detection)
    is fragile and fails on real fundus crops that aren't perfectly round.
    Color and vessel-texture checks are more reliable signals, so they're
    weighted higher and circular_fov acts as a supporting signal rather
    than a hard requirement.
    """

    image = cv2.imread(image_path)

    if image is None:
        return {"is_fundus": False, "confidence": 0.0, "reason": "Image could not be read"}

    image = cv2.resize(image, (512, 512))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 1. Retinal-like color (fundus photos are red/orange dominant)
    b, g, r = cv2.split(image)
    mean_r, mean_g, mean_b = np.mean(r), np.mean(g), np.mean(b)
    color_score = (mean_r > mean_b and mean_r > 40 and mean_g > 20)

    # 2. Circular field-of-view (fundus cameras produce a circular crop).
    #    Relaxed vs the original: lower param2 (detection threshold) and a
    #    wider radius range, since real fundus crops vary a lot in size
    #    and aren't always a perfect circle.
    circles = cv2.HoughCircles(
        gray, cv2.HOUGH_GRADIENT, dp=1.2, minDist=100,
        param1=100, param2=22, minRadius=80, maxRadius=350,
    )
    has_circular_fov = circles is not None

    # 3. Vessel-like fine structure (edge density)
    edges = cv2.Canny(gray, 30, 100)
    edge_density = np.sum(edges > 0) / edges.size
    vessel_like_score = edge_density > 0.01

    # Weighted scoring: color + vessel texture are the reliable signals,
    # circular_fov contributes but isn't a hard requirement.
    weights = {"retinal_like_color": 0.4, "vessel_like_structure": 0.4, "circular_fov": 0.2}
    checks = {
        "retinal_like_color": bool(color_score),
        "vessel_like_structure": bool(vessel_like_score),
        "circular_fov": bool(has_circular_fov),
    }
    confidence = sum(weights[name] for name, passed in checks.items() if passed)
    passed_checks = sum(checks.values())

    # Accept if the weighted confidence clears 0.5 -- e.g. color + vessel
    # alone (0.8) is enough even if circular_fov fails, but circular_fov
    # alone (0.2) is never enough on its own (a round non-fundus image
    # like a planet photo still needs a real color/texture signal too).
    is_fundus = confidence >= 0.5

    return {
        "is_fundus": bool(is_fundus),
        "confidence": round(float(confidence), 2),
        "passed_checks": int(passed_checks),
        "checks": checks,
        "reason": (
            "Valid retinal fundus characteristics detected"
            if is_fundus
            else "Image does not appear to be a valid retinal fundus image"
        ),
    }


def check_fundus_quality(image_path):
    image = cv2.imread(image_path)

    if image is None:
        return {"overall": "POOR", "passed_checks": 0, "reason": "Image could not be read"}

    h, w = image.shape[:2]
    resolution_pass = (w >= 224 and h >= 224)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    brightness = float(np.mean(gray))
    brightness_pass = 20 <= brightness <= 235

    contrast = float(np.std(gray))
    contrast_pass = contrast >= 15

    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness_pass = sharpness >= 3

    dark_ratio = float(np.mean(gray < 20))
    retinal_ratio = 1 - dark_ratio
    coverage_pass = 0.45 <= retinal_ratio <= 0.98

    saturation = hsv[:, :, 1]
    colorful_ratio = float(np.mean(saturation > 20))
    fundus_pass = (colorful_ratio >= 0.20 and retinal_ratio >= 0.45)

    border_width = max(1, int(min(h, w) * 0.02))
    top, bottom = gray[:border_width, :], gray[-border_width:, :]
    left, right = gray[:, :border_width], gray[:, -border_width:]
    border_threshold = 20
    border_touch_ratio = np.mean([
        np.mean(top > border_threshold),
        np.mean(bottom > border_threshold),
        np.mean(left > border_threshold),
        np.mean(right > border_threshold),
    ])
    cropping_pass = border_touch_ratio < 0.75

    checks = [resolution_pass, brightness_pass, contrast_pass, sharpness_pass,
              coverage_pass, fundus_pass, cropping_pass]
    passed_checks = sum(checks)
    critical_pass = sharpness_pass and coverage_pass and fundus_pass

    if passed_checks == 7 and critical_pass:
        overall = "GOOD"
    elif passed_checks >= 5 and critical_pass:
        overall = "BORDERLINE"
    else:
        overall = "POOR"

    return {
        "overall": overall, "passed_checks": passed_checks,
        "resolution_pass": resolution_pass, "brightness_pass": brightness_pass,
        "contrast_pass": contrast_pass, "sharpness_pass": sharpness_pass,
        "coverage_pass": coverage_pass, "fundus_pass": fundus_pass,
        "cropping_pass": cropping_pass, "brightness": brightness,
        "contrast": contrast, "sharpness": sharpness,
        "retinal_ratio": retinal_ratio, "colorful_ratio": colorful_ratio,
        "border_touch_ratio": border_touch_ratio,
    }


def retinal_analysis(predicted_class, image_path):
    """Stage name still comes from the model's predicted class (that's a
    legitimate classification output). The FEATURES list now comes from
    actually analyzing this specific image, not from a fixed per-grade list."""

    stage = STAGE_NAMES.get(predicted_class, "Unknown")
    lesions = detect_retinal_lesions(image_path)

    if "error" in lesions:
        return {"stage": stage, "features": ["Could not analyze image for lesions"], "lesion_detail": lesions}

    features = []
    if lesions["microaneurysms"]["count"] > 0:
        features.append(f"Microaneurysms detected ({lesions['microaneurysms']['count']} candidate regions)")
    if lesions["hemorrhages"]["count"] > 0:
        features.append(f"Hemorrhages detected ({lesions['hemorrhages']['count']} candidate regions)")
    if lesions["hard_exudates"]["count"] > 0:
        features.append(f"Hard Exudates detected ({lesions['hard_exudates']['count']} candidate regions)")
    if lesions["cotton_wool_spots"]["count"] > 0:
        features.append(f"Cotton Wool Spots detected ({lesions['cotton_wool_spots']['count']} candidate regions)")
    if not features:
        features = ["No significant lesion candidates detected by image analysis"]

    return {"stage": stage, "features": features, "lesion_detail": lesions}


def nain_ai_inference(image_path, model, device, cam):

    # --- Stage 0: is this even a fundus photo? ---
    authenticity_result = check_fundus_authenticity(image_path)
    if not authenticity_result["is_fundus"]:
        return {
            "status": "REJECTED",
            "stage": "authenticity",
            "message": "This does not look like a retinal fundus image. Please upload a genuine fundus photo.",
            "authenticity": authenticity_result,
        }

    # --- Stage 1: is the fundus photo good enough quality? ---
    quality_result = check_fundus_quality(image_path)
    if quality_result["overall"] == "POOR":
        return {
            "status": "REJECTED",
            "stage": "quality",
            "message": "Image quality is unclear. Please upload a clearer fundus image.",
            "authenticity": authenticity_result,
            "quality": quality_result,
        }

    # --- Stage 2: prediction (uses the ONE canonical transform) ---
    original_image = Image.open(image_path).convert("RGB")
    input_image = original_image.resize((224, 224))
    input_tensor = INFERENCE_TRANSFORM(original_image).unsqueeze(0).to(device)
    # Grad-CAM needs a backward pass through the input. Even though the
    # model's own parameters are frozen for stable inference, the input
    # tensor itself must require grad or there is no computation graph
    # for Grad-CAM to backpropagate through.
    input_tensor.requires_grad_(True)

    model.eval()
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, prediction = torch.max(probabilities, dim=1)

    predicted_class = prediction.item()
    retinal_result = retinal_analysis(predicted_class, image_path)

    # --- Stage 3: Grad-CAM ---
    targets = [ClassifierOutputTarget(predicted_class)]
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]
    rgb_image = np.array(input_image).astype(np.float32) / 255.0
    visualization = show_cam_on_image(rgb_image, grayscale_cam, use_rgb=True)

    return {
        "status": "ACCEPTED",
        "authenticity": authenticity_result,
        "quality": quality_result,
        "prediction": CLASS_NAMES[predicted_class],
        "class_id": predicted_class,
        "confidence": float(confidence.item()),
        "probabilities": {
            CLASS_NAMES[i]: float(probabilities[0][i].item()) for i in range(5)
        },
        "retinal_analysis": retinal_result,
        "heatmap": grayscale_cam,
        "overlay": visualization,
        "original_image": np.array(input_image),
    }
