r"""
NAIN AI — Phase 0 Integration Test
====================================
Goal: Verify nain_ai_inference() runs end-to-end and that its NumPy
      outputs can be converted to JSON-serializable base64 PNG strings.

Run:
    cd d:\Nain_Ai
    python test_inference_json.py

Expected result:
    ALL CHECKS PASSED — result is fully JSON-serializable
"""

import sys
import os
import json
import io
import base64
import tempfile
import traceback

import numpy as np
from PIL import Image

# ── Point Python at the existing ML code ────────────────────────────────────
ML_ROOT = os.path.join(os.path.dirname(__file__), "NAIN_AI_BACKEND_HANDOFF")
sys.path.insert(0, ML_ROOT)
sys.path.insert(0, os.path.join(ML_ROOT, "inference"))

from model_loader import load_model, build_cam
from nain_ai_inference import nain_ai_inference, check_fundus_quality

# ── Helpers ──────────────────────────────────────────────────────────────────

def numpy_to_base64_png(array: np.ndarray) -> str:
    """
    Convert a NumPy array to a base64-encoded PNG string.
    Handles both float arrays (0.0-1.0) and uint8 arrays.
    This is the fix that makes the inference result JSON-serializable.
    """
    if array.dtype != np.uint8:
        array = (np.clip(array, 0.0, 1.0) * 255).astype(np.uint8)

    if array.ndim == 2:
        array = np.stack([array] * 3, axis=-1)

    img = Image.fromarray(array)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def make_json_serializable(result: dict) -> dict:
    """
    Replace all NumPy arrays in the inference result with base64 PNG strings.
    Other values (str, int, float, dict) are passed through unchanged.
    """
    serializable = {}
    for key, value in result.items():
        if isinstance(value, np.ndarray):
            serializable[key + "_b64"] = numpy_to_base64_png(value)
        elif isinstance(value, dict):
            serializable[key] = {k: float(v) for k, v in value.items()}
        else:
            serializable[key] = value
    return serializable


def verify_base64_is_valid_png(b64_string: str, label: str):
    """Decode a base64 string and verify it represents a valid PNG image."""
    try:
        raw = base64.b64decode(b64_string)
        img = Image.open(io.BytesIO(raw))
        img.verify()
        print(f"  ✅  {label}: valid PNG (decoded ok)")
    except Exception as e:
        print(f"  ❌  {label}: base64→PNG verification FAILED: {e}")
        raise


# ── Create a synthetic test fundus image ─────────────────────────────────────

def create_synthetic_fundus_image(path: str, size: int = 512):
    """
    Create a synthetic fundus-like image that will pass the quality gate.
    - Orange/red central circle (retinal area)
    - Dark surrounding border (like a real fundus image)
    """
    img = np.zeros((size, size, 3), dtype=np.uint8)
    center = size // 2
    radius = int(size * 0.42)

    Y, X = np.ogrid[:size, :size]
    mask = (X - center) ** 2 + (Y - center) ** 2 <= radius ** 2

    img[mask, 0] = 180   # R
    img[mask, 1] = 90    # G
    img[mask, 2] = 60    # B

    noise = np.random.randint(-20, 20, (size, size, 3), dtype=np.int16)
    img_noisy = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    pil_img = Image.fromarray(img_noisy)
    pil_img.save(path, format="JPEG", quality=95)
    print(f"  📷  Synthetic fundus image created: {path} ({size}x{size}px)")


# ── Main test ─────────────────────────────────────────────────────────────────

def run_test():
    print("=" * 60)
    print("NAIN AI — Phase 0 ML Integration Test")
    print("=" * 60)

    checks_passed = 0
    checks_total = 0

    # ── Step 1: Load model ───────────────────────────────────────────────────
    print("\n[1/6] Loading model...")
    checks_total += 1
    try:
        weights_path = os.path.join(ML_ROOT, "model", "final_best_dr_model.pth")
        assert os.path.exists(weights_path), f"Model weights not found at: {weights_path}"
        model = load_model(weights_path=weights_path, device="cpu")
        cam = build_cam(model)
        print(f"  ✅  Model loaded from: {weights_path}")
        print(f"  ✅  GradCAM built successfully")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌  Model loading FAILED: {e}")
        traceback.print_exc()
        print("\nFATAL: Cannot proceed without model. Aborting test.")
        return False

    # ── Step 2: Create synthetic test image ──────────────────────────────────
    print("\n[2/6] Creating synthetic test fundus image...")
    checks_total += 1
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tf:
            test_image_path = tf.name
        create_synthetic_fundus_image(test_image_path)
        checks_passed += 1
    except Exception as e:
        print(f"  ❌  Image creation FAILED: {e}")
        return False

    # ── Step 3: Run quality check ────────────────────────────────────────────
    print("\n[3/6] Running fundus quality check...")
    checks_total += 1
    try:
        quality = check_fundus_quality(test_image_path)
        print(f"  Quality result: {quality['overall']}")
        print(f"  Passed checks: {quality['passed_checks']}/7")
        print(f"  Sharpness: {quality['sharpness']:.2f} (need >= 3)")
        print(f"  Coverage:  {quality['retinal_ratio']:.2f} (need 0.45-1.0)")
        print(f"  Fundus:    {quality['colorful_ratio']:.2f} (need >= 0.20)")
        if quality["overall"] == "POOR":
            print("  ⚠️  Image rated POOR — inference will return REJECTED status")
            print("      This is acceptable for Phase 0. Use a real fundus image for ACCEPTED result.")
        else:
            print(f"  ✅  Quality gate: {quality['overall']}")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌  Quality check FAILED: {e}")
        traceback.print_exc()
        return False

    # ── Step 4: Run full inference ───────────────────────────────────────────
    print("\n[4/6] Running nain_ai_inference()...")
    checks_total += 1
    try:
        result = nain_ai_inference(
            image_path=test_image_path,
            model=model,
            device="cpu",
            cam=cam
        )
        print(f"  Inference status: {result['status']}")
        print(f"\n  Output keys and types:")
        for key, value in result.items():
            vtype = type(value).__name__
            if isinstance(value, np.ndarray):
                vtype = f"numpy.ndarray shape={value.shape} dtype={value.dtype}"
            elif isinstance(value, dict):
                vtype = f"dict ({len(value)} keys)"
            print(f"    {key:20s} -> {vtype}")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌  Inference FAILED: {e}")
        traceback.print_exc()
        return False

    # ── Step 5: Check for NumPy serialization bug ────────────────────────────
    print("\n[5/6] Checking for NumPy serialization bug...")
    checks_total += 1
    numpy_keys = [k for k, v in result.items() if isinstance(v, np.ndarray)]
    if numpy_keys:
        print(f"  ⚠️  BUG CONFIRMED: These keys contain NumPy arrays (not JSON-serializable):")
        for k in numpy_keys:
            print(f"       - {k}: shape={result[k].shape}, dtype={result[k].dtype}")
        print(f"\n  Applying fix: converting NumPy arrays to base64 PNG strings...")
        try:
            serializable_result = make_json_serializable(result)
            json_string = json.dumps(serializable_result)
            print(f"  ✅  json.dumps() succeeded — result is now fully JSON-serializable")
            print(f"  JSON payload size: {len(json_string) / 1024:.1f} KB")
            checks_passed += 1

            print(f"\n  Verifying base64 PNG outputs:")
            for orig_key in numpy_keys:
                new_key = orig_key + "_b64"
                if new_key in serializable_result:
                    verify_base64_is_valid_png(serializable_result[new_key], new_key)

        except TypeError as e:
            print(f"  ❌  json.dumps() STILL FAILED after conversion: {e}")
            return False
    else:
        try:
            json.dumps(result)
            print(f"  ✅  No NumPy arrays in result (image was REJECTED for quality).")
            print(f"      json.dumps() succeeded on REJECTED result.")
            checks_passed += 1
        except TypeError as e:
            print(f"  ❌  json.dumps() FAILED even on REJECTED result: {e}")
            return False

    # ── Step 6: Final round-trip check ───────────────────────────────────────
    print("\n[6/6] Final JSON serialization round-trip check...")
    checks_total += 1
    try:
        final_result = make_json_serializable(result)
        json_output = json.dumps(final_result, indent=2)
        json.loads(json_output)
        print(f"  ✅  json.dumps() + json.loads() round-trip succeeded")
        checks_passed += 1
    except Exception as e:
        print(f"  ❌  Final JSON check FAILED: {e}")
        return False

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"RESULTS: {checks_passed}/{checks_total} checks passed")
    if checks_passed == checks_total:
        print("✅  ALL CHECKS PASSED — result is fully JSON-serializable")
        print("    Phase 0 complete. Proceed to Phase 1 (repo setup).")
    else:
        print("❌  SOME CHECKS FAILED — review output above before proceeding")
    print("=" * 60)

    try:
        os.unlink(test_image_path)
    except Exception:
        pass

    return checks_passed == checks_total


if __name__ == "__main__":
    np.random.seed(42)
    success = run_test()
    sys.exit(0 if success else 1)
