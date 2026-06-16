import { Vector3, Quaternion } from "three";
import { computeForwardKinematics } from "./forwardKinematics";
import { JOINT_LIMITS } from "./constants";

export type IKTarget = {
  position: Vector3;
  quaternion?: Quaternion;
};

export type IKResult = {
  angles: number[];
  position: Vector3;
  quaternion: Quaternion;
  positionError: number;
  orientationError: number;
  totalError: number;
  success: boolean;
};

const limits = Object.values(JOINT_LIMITS);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomAngles() {
  return limits.map((limit) => randomBetween(limit.min, limit.max));
}

function mutateAngles(angles: number[], stepSize: number) {
  return angles.map((angle, i) => {
    const mutated = angle + randomBetween(-stepSize, stepSize);
    return clamp(mutated, limits[i].min, limits[i].max);
  });
}

function quaternionError(a: Quaternion, b: Quaternion) {
  const dot = Math.abs(a.dot(b));
  const clampedDot = Math.min(1, Math.max(-1, dot));

  return 2 * Math.acos(clampedDot);
}

function evaluate(angles: number[], target: IKTarget) {
  const fk = computeForwardKinematics(angles);

  const positionError = fk.position.distanceTo(target.position);

  const orientationError = target.quaternion
    ? quaternionError(fk.quaternion, target.quaternion)
    : 0;

  const totalError = positionError + orientationError * 0.08;

  return {
    position: fk.position,
    quaternion: fk.quaternion,
    positionError,
    orientationError,
    totalError,
  };
}

export function solveIK(target: IKTarget): IKResult {
  let bestAngles = randomAngles();
  let bestEval = evaluate(bestAngles, target);

  const restarts = 50;
  const iterations = 300;

  const positionThreshold = 0.05;
  const orientationThreshold = 0.6;

  for (let r = 0; r < restarts; r++) {
    let currentAngles = randomAngles();
    let currentEval = evaluate(currentAngles, target);

    let stepSize = 25;

    for (let i = 0; i < iterations; i++) {
      const candidateAngles = mutateAngles(currentAngles, stepSize);
      const candidateEval = evaluate(candidateAngles, target);

      if (candidateEval.totalError < currentEval.totalError) {
        currentAngles = candidateAngles;
        currentEval = candidateEval;
      }

      if (currentEval.totalError < bestEval.totalError) {
        bestAngles = currentAngles;
        bestEval = currentEval;
      }

      stepSize *= 0.985;

      const positionGood = bestEval.positionError < positionThreshold;
      const orientationGood =
        !target.quaternion || bestEval.orientationError < orientationThreshold;

      if (positionGood && orientationGood) {
        return {
          angles: bestAngles,
          ...bestEval,
          success: true,
        };
      }
    }
  }

  const success =
    bestEval.positionError < positionThreshold &&
    (!target.quaternion || bestEval.orientationError < orientationThreshold);

  return {
    angles: bestAngles,
    ...bestEval,
    success,
  };
}