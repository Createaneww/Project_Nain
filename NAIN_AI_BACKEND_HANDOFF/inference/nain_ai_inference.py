# pyrefly: ignore [missing-import]
import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image


CLASS_NAMES = [
    "No DR",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative"
]




RETINAL_FEATURE_MAPPING = {
    0: {
        "stage": "No DR",
        "features": [
            "No characteristic DR lesions"
        ]
    },

    1: {
        "stage": "Mild NPDR",
        "features": [
            "Microaneurysms"
        ]
    },

    2: {
        "stage": "Moderate NPDR",
        "features": [
            "Exudates",
            "Hemorrhages",
            "Cotton Wool Spots"
        ]
    },

    3: {
        "stage": "Severe NPDR",
        "features": [
            "Hemorrhages",
            "IRMA",
            "Retinal Ischemia / Ghost Vessels"
        ]
    },

    4: {
        "stage": "Proliferative DR",
        "features": [
            "Neovascularization"
        ]
    }
}

print("Retinal feature mapping restored!")


def retinal_analysis(predicted_class):

    analysis = RETINAL_FEATURE_MAPPING.get(
        predicted_class,
        {
            "stage": "Unknown",
            "features": []
        }
    )

    return {
        "stage": analysis["stage"],
        "features": analysis["features"]
    }


print("Retinal Analysis function ready!")


def check_fundus_quality(image_path):

    image = cv2.imread(image_path)

    if image is None:
        return {
            "overall": "POOR",
            "passed_checks": 0,
            "reason": "Image could not be read"
        }

    h, w = image.shape[:2]

    resolution_pass = (w >= 224 and h >= 224)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    brightness = float(np.mean(gray))
    brightness_pass = 20 <= brightness <= 235

    contrast = float(np.std(gray))
    contrast_pass = contrast >= 15

    sharpness = float(
        cv2.Laplacian(
            gray,
            cv2.CV_64F
        ).var()
    )
    sharpness_pass = sharpness >= 3

    dark_ratio = float(np.mean(gray < 20))
    retinal_ratio = 1 - dark_ratio

    coverage_pass = (
        0.45 <= retinal_ratio <= 1.0
    )

    saturation = hsv[:, :, 1]

    colorful_ratio = float(
        np.mean(saturation > 20)
    )

    fundus_pass = (
        colorful_ratio >= 0.20
        and retinal_ratio >= 0.45
    )

    border_width = max(
        1,
        int(min(h, w) * 0.02)
    )

    top = gray[:border_width, :]
    bottom = gray[-border_width:, :]
    left = gray[:, :border_width]
    right = gray[:, -border_width:]

    border_threshold = 20

    border_touch_ratio = np.mean([
        np.mean(top > border_threshold),
        np.mean(bottom > border_threshold),
        np.mean(left > border_threshold),
        np.mean(right > border_threshold)
    ])

    cropping_pass = border_touch_ratio < 0.75

    checks = [
        resolution_pass,
        brightness_pass,
        contrast_pass,
        sharpness_pass,
        coverage_pass,
        fundus_pass,
        cropping_pass
    ]

    passed_checks = sum(checks)

    critical_pass = (
        sharpness_pass
        and coverage_pass
        and fundus_pass
    )

    if passed_checks == 7 and critical_pass:
        overall = "GOOD"

    elif passed_checks >= 5 and critical_pass:
        overall = "BORDERLINE"

    else:
        overall = "POOR"

    return {
        "overall": overall,
        "passed_checks": passed_checks,
        "resolution_pass": resolution_pass,
        "brightness_pass": brightness_pass,
        "contrast_pass": contrast_pass,
        "sharpness_pass": sharpness_pass,
        "coverage_pass": coverage_pass,
        "fundus_pass": fundus_pass,
        "cropping_pass": cropping_pass,
        "brightness": brightness,
        "contrast": contrast,
        "sharpness": sharpness,
        "retinal_ratio": retinal_ratio,
        "colorful_ratio": colorful_ratio,
        "border_touch_ratio": border_touch_ratio
    }


def quality_gated_prediction(
    image_path,
    model,
    device
):

    quality_result = check_fundus_quality(
        image_path
    )

    if quality_result["overall"] == "POOR":

        return {
            "status": "REJECTED",
            "message": (
                "Image quality is unclear. "
                "Please upload a clearer image."
            ),
            "quality": quality_result
        }

    image = Image.open(
        image_path
    ).convert("RGB")

    resized = image.resize((224, 224))

    image_tensor = transforms.ToTensor()(
        resized
    ).unsqueeze(0).to(device)

    model.eval()

    with torch.no_grad():

        outputs = model(
            image_tensor
        )

        probabilities = torch.softmax(
            outputs,
            dim=1
        )

        confidence, prediction = torch.max(
            probabilities,
            dim=1
        )

    predicted_class = prediction.item()

    return {
        "status": "ACCEPTED",
        "quality": quality_result,
        "prediction": CLASS_NAMES[predicted_class],
        "class_id": predicted_class,
        "confidence": float(
            confidence.item()
        ),
        "probabilities": {
            CLASS_NAMES[i]: float(
                probabilities[0][i].item()
            )
            for i in range(5)
        }
    }


def nain_ai_inference(
    image_path,
    model,
    device,
    cam
):

    quality_result = check_fundus_quality(
        image_path
    )

    if quality_result["overall"] == "POOR":

        return {
            "status": "REJECTED",
            "message": (
                "Image quality is unclear. "
                "Please upload a clearer image."
            ),
            "quality": quality_result
        }

    original_image = Image.open(
        image_path
    ).convert("RGB")

    input_image = original_image.resize(
        (224, 224)
    )

    input_tensor = transforms.ToTensor()(
        input_image
    ).unsqueeze(0).to(device)

    model.eval()

    with torch.no_grad():

        outputs = model(
            input_tensor
        )

        probabilities = torch.softmax(
            outputs,
            dim=1
        )

        confidence, prediction = torch.max(
            probabilities,
            dim=1
        )

    predicted_class = prediction.item()

    retinal_result = retinal_analysis(
        predicted_class
    )

    targets = [
        ClassifierOutputTarget(
            predicted_class
        )
    ]

    grayscale_cam = cam(
        input_tensor=input_tensor,
        targets=targets
    )[0]

    rgb_image = np.array(
        input_image
    ).astype(np.float32) / 255.0

    visualization = show_cam_on_image(
        rgb_image,
        grayscale_cam,
        use_rgb=True
    )

    return {
        "status": "ACCEPTED",
        "quality": quality_result,
        "prediction": CLASS_NAMES[predicted_class],
        "class_id": predicted_class,
        "confidence": float(
            confidence.item()
        ),
        "probabilities": {
            CLASS_NAMES[i]: float(
                probabilities[0][i].item()
            )
            for i in range(5)
        },
        "retinal_analysis": retinal_result,
        "heatmap": grayscale_cam,
        "overlay": visualization,
        "original_image": np.array(
            input_image
        )
    }
