import math
import time

import numpy as np
import pybullet as p
import pybullet_data

from nn_controller import predict_angles


def create_target_marker(position):
    target_visual = p.createVisualShape(
        p.GEOM_SPHERE,
        radius=0.07,
        rgbaColor=[1, 0, 0, 1],
    )

    return p.createMultiBody(
        baseMass=0,
        baseVisualShapeIndex=target_visual,
        basePosition=position,
    )


def random_target():
    while True:
        x = np.random.uniform(0.4, 2.2)
        y = np.random.uniform(-1.5, 1.5)
        z = np.random.uniform(0.15, 1.6)

        distance_from_base = np.sqrt(x**2 + y**2 + (z - 0.1) ** 2)

        if 0.6 <= distance_from_base <= 2.35:
            return [x, y, z]


def main():
    p.connect(p.GUI)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())

    p.setGravity(0, 0, 0)
    p.loadURDF("plane.urdf")

    robot = p.loadURDF(
        "robot_arm.urdf",
        basePosition=[0, 0, 0],
        useFixedBase=True,
    )

    p.resetDebugVisualizerCamera(
        cameraDistance=4,
        cameraYaw=45,
        cameraPitch=-30,
        cameraTargetPosition=[1.0, 0, 0.5],
    )

    target_position = random_target()
    target_body = create_target_marker(target_position)

    last_target_change = time.perf_counter()
    target_change_interval = 2.0

    frame_count = 0

    while True:
        current_time = time.perf_counter()

        if current_time - last_target_change >= target_change_interval:
            target_position = random_target()
            p.resetBasePositionAndOrientation(
                target_body,
                target_position,
                [0, 0, 0, 1],
            )
            last_target_change = current_time

        # Exact PyBullet IK timing
        ik_start = time.perf_counter()
        ik = p.calculateInverseKinematics(robot, 3, target_position)
        ik_time = time.perf_counter() - ik_start

        # Neural network timing
        nn_start = time.perf_counter()
        j1, j2, j3 = predict_angles(target_position)
        nn_time = time.perf_counter() - nn_start

        # Use NN prediction to control robot
        p.setJointMotorControl2(
            robot,
            0,
            p.POSITION_CONTROL,
            targetPosition=j1,
            force=500,
        )
        p.setJointMotorControl2(
            robot,
            1,
            p.POSITION_CONTROL,
            targetPosition=j2,
            force=500,
        )
        p.setJointMotorControl2(
            robot,
            2,
            p.POSITION_CONTROL,
            targetPosition=j3,
            force=500,
        )

        p.stepSimulation()

        end_effector_state = p.getLinkState(
            robot,
            3,
            computeForwardKinematics=True,
        )
        head_pos = np.array(end_effector_state[0])
        target_np = np.array(target_position)

        nn_error = np.linalg.norm(head_pos - target_np)

        # Draw red error line
        p.addUserDebugLine(
            head_pos,
            target_position,
            lineColorRGB=[1, 0, 0],
            lineWidth=2,
            lifeTime=1 / 240,
        )

        p.addUserDebugText(
            "HEAD",
            head_pos,
            textColorRGB=[1, 1, 0],
            textSize=1.2,
            lifeTime=1 / 240,
        )

        # Print every 30 frames so terminal is not spammed too hard
        if frame_count % 30 == 0:
            print("================================")
            print("Target:", np.round(target_np, 3))
            print("Head:", np.round(head_pos, 3))
            print(f"NN Error: {nn_error:.4f} m")
            print(f"PyBullet IK time: {ik_time * 1000:.4f} ms")
            print(f"NN time: {nn_time * 1000:.4f} ms")
            print("Exact IK angles:", np.round(ik[:3], 3))
            print("NN angles:", np.round([j1, j2, j3], 3))

        frame_count += 1
        time.sleep(1 / 240)


if __name__ == "__main__":
    main()
