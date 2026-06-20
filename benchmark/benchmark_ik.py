# benchmark/benchmark_ik.py

import time
import numpy as np
import torch
import pandas as pd
from pathlib import Path
from scipy.spatial.transform import Rotation as R
import numpy as np
import joblib
import torch.nn as nn

N_TEST = 5000
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

RESULTS_DIR = Path("./results")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_HEIGHT = 0.25
UPPER_ARM_LENGTH = 1.2
FOREARM_LENGTH = 1.0
WRIST_LENGTH = 0.45
TOOL_LENGTH = 0.35
TCP_OFFSET = 0.5


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


def fk_numpy(joint_angles):
    """
    Input:  shape (6,)
    Output: position (3,), quaternion (4,) as [qx,qy,qz,qw]
    """

    def trans(x, y, z):
        T = np.eye(4)
        T[0, 3] = x
        T[1, 3] = y
        T[2, 3] = z
        return T

    def rot_x(a):
        c, s = np.cos(a), np.sin(a)
        return np.array([[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]])

    def rot_y(a):
        c, s = np.cos(a), np.sin(a)
        return np.array([[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]])

    def rot_z(a):
        c, s = np.cos(a), np.sin(a)
        return np.array([[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])

    j1, j2, j3, j4, j5, j6 = joint_angles
    T = np.eye(4)
    T = T @ trans(0, BASE_HEIGHT, 0)
    T = T @ rot_y(j1)
    T = T @ rot_z(j2)
    T = T @ trans(UPPER_ARM_LENGTH, 0, 0)
    T = T @ rot_z(j3)
    T = T @ trans(FOREARM_LENGTH, 0, 0)
    T = T @ rot_z(j4)
    T = T @ trans(WRIST_LENGTH, 0, 0)
    T = T @ rot_y(j5)
    T = T @ trans(TOOL_LENGTH, 0, 0)
    T = T @ rot_x(j6)
    T = T @ trans(TCP_OFFSET, 0, 0)
    position = T[:3, 3]
    rotation_matrix = T[:3, :3]
    quaternion = R.from_matrix(rotation_matrix).as_quat()
    return position, quaternion


def numerical_ik(target_pos, target_quat, seed_angles):
    """
    Return predicted joint angles shape (6,)
    """
    raise NotImplementedError


def load_angle_loss_model():
    model = IKNet()
    model.load_state_dict(torch.load("robot_6dof_ik_nn.pth", map_location=DEVICE))
    model.eval()
    scaler = joblib.load("x_scaler_6dof.pkl")
    return model, scaler


def load_fk_loss_model():
    model = IKNet()
    model.load_state_dict(torch.load("best_fk_loss_ik_model.pth", map_location=DEVICE))
    model.eval()
    scaler = joblib.load("x_scaler_fk_loss_6dof.pkl")
    return model, scaler


def neural_predict(model, scaler, target_pos, target_quat, seed_angles):
    """
    Model input: target pose + seed angles = 13 values
    Model output: sin/cos joint representation = 12 values
    Convert back to 6 angles.
    """
    x = np.concatenate([target_pos, target_quat, seed_angles])
    x_scaled = scaler.transform(x.reshape(1, -1))
    x_t = torch.tensor(x_scaled, dtype=torch.float32).to(DEVICE)
    with torch.no_grad():
        y = model(x_t).cpu().numpy()[0]
    sin_vals = y[:6]
    cos_vals = y[6:]
    angles = np.arctan2(sin_vals, cos_vals)
    return angles


# --------------------------------------------------
# Metrics
# --------------------------------------------------


def position_error(pred_pos, target_pos):
    return np.linalg.norm(pred_pos - target_pos)


def orientation_error_deg(pred_quat, target_quat):
    pred_quat = pred_quat / np.linalg.norm(pred_quat)
    target_quat = target_quat / np.linalg.norm(target_quat)

    dot = abs(np.dot(pred_quat, target_quat))
    dot = np.clip(dot, -1.0, 1.0)

    return np.degrees(2 * np.arccos(dot))


def summarize(method_name, pos_errors, ori_errors, times_ms):
    return {
        "Method": method_name,
        "Mean Pos Error (m)": np.mean(pos_errors),
        "Median Pos Error (m)": np.median(pos_errors),
        "95% Pos Error (m)": np.percentile(pos_errors, 95),
        "Max Pos Error (m)": np.max(pos_errors),
        "Mean Ori Error (deg)": np.mean(ori_errors),
        "Median Ori Error (deg)": np.median(ori_errors),
        "95% Ori Error (deg)": np.percentile(ori_errors, 95),
        "Max Ori Error (deg)": np.max(ori_errors),
        "Avg Time (ms)": np.mean(times_ms),
        "Position Success Rate <10cm (%)": np.mean(np.array(pos_errors) < 0.10) * 100,
    }


# --------------------------------------------------
# Test set generation
# --------------------------------------------------


def generate_test_set(n):
    test_data = []

    for _ in range(n):
        true_angles = np.random.uniform(
            low=[-np.pi, -np.pi / 2, -np.pi / 2, -np.pi, -np.pi, -np.pi],
            high=[np.pi, np.pi / 2, np.pi / 2, np.pi, np.pi, np.pi],
        )

        pos, quat = fk_numpy(true_angles)

        seed_angles = true_angles + np.random.normal(0, 0.15, size=6)

        test_data.append(
            {
                "target_pos": pos,
                "target_quat": quat,
                "true_angles": true_angles,
                "seed_angles": seed_angles,
            }
        )

    return test_data


# --------------------------------------------------
# Benchmark runner
# --------------------------------------------------


def run_method(method_name, test_data, solver_fn):
    pos_errors = []
    ori_errors = []
    times_ms = []

    for sample in test_data:
        target_pos = sample["target_pos"]
        target_quat = sample["target_quat"]
        seed_angles = sample["seed_angles"]

        start = time.perf_counter()
        pred_angles = solver_fn(target_pos, target_quat, seed_angles)
        end = time.perf_counter()

        pred_pos, pred_quat = fk_numpy(pred_angles)

        pos_errors.append(position_error(pred_pos, target_pos))
        ori_errors.append(orientation_error_deg(pred_quat, target_quat))
        times_ms.append((end - start) * 1000)

    return (
        summarize(method_name, pos_errors, ori_errors, times_ms),
        pos_errors,
        ori_errors,
    )


def main():
    print(f"Using device: {DEVICE}")
    print(f"Generating {N_TEST} unseen test samples...")

    test_data = generate_test_set(N_TEST)

    angle_model, angle_scaler = load_angle_loss_model()
    fk_model, fk_scaler = load_fk_loss_model()

    angle_model.to(DEVICE).eval()
    fk_model.to(DEVICE).eval()

    methods = [
        (
            "NN Angle Loss",
            lambda pos, quat, seed: neural_predict(
                angle_model, angle_scaler, pos, quat, seed
            ),
        ),
        (
            "NN FK Loss",
            lambda pos, quat, seed: neural_predict(
                fk_model, fk_scaler, pos, quat, seed
            ),
        ),
    ]

    summaries = {}

    for name, solver in methods:
        print(f"Running benchmark: {name}")
        summary, pos_errors, ori_errors = run_method(name, test_data, solver)

        summaries[name] = {
            "summary": summary,
            "pos_errors": pos_errors,
            "ori_errors": ori_errors,
        }

    df = pd.DataFrame([summaries[name]["summary"] for name in summaries])

    print("\nBenchmark Results:")
    print(df)

    df.to_csv(RESULTS_DIR / "benchmark_table.csv", index=False)

    np.savez(
        RESULTS_DIR / "raw_errors.npz",
        # numerical_pos=summaries["Numerical IK"]["pos_errors"],
        angle_loss_pos=summaries["NN Angle Loss"]["pos_errors"],
        fk_loss_pos=summaries["NN FK Loss"]["pos_errors"],
        # numerical_ori=summaries["Numerical IK"]["ori_errors"],
        angle_loss_ori=summaries["NN Angle Loss"]["ori_errors"],
        fk_loss_ori=summaries["NN FK Loss"]["ori_errors"],
    )

    print(f"\nSaved results to: {RESULTS_DIR}")


if __name__ == "__main__":
    main()
