
NAIN AI — BACKEND HANDOFF
=========================

Project:
Explainable AI Diabetic Retinopathy Screening Prototype

MODEL
-----
EfficientNet-B0

DR Classes
----------
0 = No DR
1 = Mild
2 = Moderate
3 = Severe
4 = Proliferative

PIPELINE
--------
1. Fundus Image Upload
2. Quality Assessment
3. Poor Image -> Re-upload
4. DR Classification
5. Retinal Feature Mapping
6. Grad-CAM
7. Final Result

QUALITY GATE
------------
GOOD image -> ACCEPTED
POOR image -> REJECTED

GRAD-CAM
--------
Grad-CAM is generated for the model's predicted DR class.

Output includes:
- Original fundus image
- Grad-CAM heatmap
- Grad-CAM overlay

RETINAL ANALYSIS
----------------
Grade 0 -> No characteristic DR lesions
Grade 1 -> Microaneurysms
Grade 2 -> Exudates, Hemorrhages, Cotton Wool Spots
Grade 3 -> Hemorrhages, IRMA, Retinal Ischemia / Ghost Vessels
Grade 4 -> Neovascularization

MAIN FILE
---------
inference/nain_ai_inference.py

MODEL FILE
----------
model/final_best_dr_model.pth
