import math
import numpy as np

L1 = 1.0
L2 = 1.0
L3 = 0.5
BASE_HEIGHT = 0.1


def forward_kinematics(j1, j2, j3):
    a2 = -j2
    a3 = -j3

    r = L1 * math.cos(a2) + (L2 + L3) * math.cos(a2 + a3)
    z = BASE_HEIGHT + L1 * math.sin(a2) + (L2 + L3) * math.sin(a2 + a3)

    x = r * math.cos(j1)
    y = r * math.sin(j1)

    return np.array([x, y, z])
