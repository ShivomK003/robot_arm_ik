import joblib
import numpy as np
import torch
import torch.nn as nn


class IKNet(nn.Module):
    def __init__(self):
        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(13, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(512, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 12),
        )

    def forward(self, x):
        return self.net(x)


device = torch.device("cpu")

model = IKNet()
model.load_state_dict(
    torch.load("model/best_fk_loss_ik_model.pth", map_location=device)
)
model.eval()

x_scaler = joblib.load("model/x_scaler_fk_loss_6dof.pkl")


def sincos_to_angles_deg(pred_sincos: np.ndarray) -> np.ndarray:
    sin_vals = pred_sincos[:, :6]
    cos_vals = pred_sincos[:, 6:]

    angles_rad = np.arctan2(sin_vals, cos_vals)
    angles_deg = np.rad2deg(angles_rad)

    return angles_deg


def predict_angles(
    target_position: list[float],
    target_quaternion: list[float],
    current_joint_angles: list[float],
) -> list[float]:
    model_input = np.array(
        [
            *target_position,
            *target_quaternion,
            *current_joint_angles,
        ],
        dtype=np.float32,
    ).reshape(1, -1)

    model_input_scaled = x_scaler.transform(model_input)

    input_tensor = torch.tensor(
        model_input_scaled,
        dtype=torch.float32,
        device=device,
    )

    with torch.no_grad():
        pred_sincos = model(input_tensor).cpu().numpy()

    pred_angles = sincos_to_angles_deg(pred_sincos)

    return pred_angles[0].tolist()
