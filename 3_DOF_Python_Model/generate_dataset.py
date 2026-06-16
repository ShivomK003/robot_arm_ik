import pybullet as p
import pybullet_data
import numpy as np
import csv

p.connect(p.DIRECT)

robot = p.loadURDF("robot_arm.urdf", basePosition=[0, 0, 0], useFixedBase=True)

samples = []

for _ in range(50000):
    x = np.random.uniform(0.3, 2.3)
    y = np.random.uniform(-2.0, 2.0)
    z = np.random.uniform(0.1, 1.5)

    target = [x, y, z]

    ik = p.calculateInverseKinematics(robot, 3, target)

    j1, j2, j3 = ik[:3]

    p.resetJointState(robot, 0, ik[0])
    p.resetJointState(robot, 1, ik[1])
    p.resetJointState(robot, 2, ik[2])

    head_pos = np.array(p.getLinkState(robot, 3, computeForwardKinematics=True)[0])

    error = np.linalg.norm(head_pos - np.array(target))

    if error < 0.03:
        samples.append([x, y, z, ik[0], ik[1], ik[2]])

        samples.append([x, y, z, j1, j2, j3])

with open("robot_dataset.csv", "w", newline="") as f:
    writer = csv.writer(f)

    writer.writerow(["x", "y", "z", "j1", "j2", "j3"])

    writer.writerows(samples)

print("Saved", len(samples), "samples")
