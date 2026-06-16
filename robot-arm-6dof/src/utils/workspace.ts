import { Vector3 } from "three";
import { computeForwardKinematics } from "./forwardKinematics";
import { JOINT_LIMITS } from "./constants";

export type WorkspacePoint = {
  position: Vector3;
  jointAngles: number[];
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function generateWorkspaceSamples(sampleCount: number): WorkspacePoint[] {
  const limits = Object.values(JOINT_LIMITS);
  const points: WorkspacePoint[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const jointAngles = limits.map((limit) =>
      randomBetween(limit.min, limit.max)
    );

    const fk = computeForwardKinematics(jointAngles);

    points.push({
      position: fk.position.clone(),
      jointAngles,
    });
  }

  return points;
}

export function findNearestWorkspacePoint(
  target: Vector3,
  workspace: WorkspacePoint[]
) {
  let nearest = workspace[0];
  let minDistance = Infinity;

  for (const point of workspace) {
    const distance = target.distanceTo(point.position);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }

  return {
    nearest,
    distance: minDistance,
  };
}