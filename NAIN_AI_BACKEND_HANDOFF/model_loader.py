# pyrefly: ignore [import-error, missing-import]
import torch
# pyrefly: ignore [missing-import]
from torchvision.models import efficientnet_b0


def load_model(weights_path="model/final_best_dr_model.pth", device="cpu"):
    model = efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(1280, 5)

    state_dict = torch.load(weights_path, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)

    model.to(device)
    model.eval()
    return model


def build_cam(model):
    # pyrefly: ignore [missing-import]
    from pytorch_grad_cam import GradCAM
    target_layer = model.features[-1]
    return GradCAM(model=model, target_layers=[target_layer])