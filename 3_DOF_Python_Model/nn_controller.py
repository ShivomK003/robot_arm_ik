import os
import joblib
import numpy as np
import torch
import torch.nn as nn


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "Model_Training")


class IKNet(nn.Module):
    def __init__(self):
        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(3, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.05),
            nn.Linear(256, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.05),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 3),
        )

    def forward(self, x):
        return self.net(x)


model = IKNet()
model.load_state_dict(
    torch.load(os.path.join(MODEL_DIR, "robot_ik_nn.pth"), map_location="cpu")
)
model.eval()

x_scaler = joblib.load(os.path.join(MODEL_DIR, "x_scaler.pkl"))
y_scaler = joblib.load(os.path.join(MODEL_DIR, "y_scaler.pkl"))


def predict_angles(target_position):
    x = np.array(target_position).reshape(1, -1)
    x_scaled = x_scaler.transform(x)

    x_tensor = torch.tensor(x_scaled, dtype=torch.float32)

    with torch.no_grad():
        y_scaled = model(x_tensor).numpy()

    angles = y_scaler.inverse_transform(y_scaled)[0]

    return angles
