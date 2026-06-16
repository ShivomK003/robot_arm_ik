import math
import numpy as np
from scipy.optimize import least_squares

from kinematics import forward_kinematics


def solve_ik(target_position, initial_guess=None):
    target_position = np.array(target_position)

    if initial_guess is None:
        initial_guess = np.array([0.2, -0.4, 0.8])

    def error(joints):
        predicted_position = forward_kinematics(joints[0], joints[1], joints[2])
        return predicted_position - target_position

    result = least_squares(
        error,
        x0=np.array(initial_guess),
        bounds=(
            [-math.pi, -math.pi / 2, -math.pi],
            [math.pi, math.pi / 2, math.pi],
        ),
    )

    return result.x
