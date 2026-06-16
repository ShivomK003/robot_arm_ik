import { Vector3 } from "three";
import { computeForwardKinematics } from "./forwardKinematics";
import { JOINT_LIMITS } from "./constants";

export type IKResult = {
  angles: number[];
  position: Vector3;
  error: number;
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

function evaluate(angles: number[], target: Vector3) {
  const fk = computeForwardKinematics(angles);
  return {
    position: fk.position,
    error: fk.position.distanceTo(target),
  };
}

export function solveIK(target: Vector3): IKResult {
  let bestAngles = randomAngles();
  let bestEval = evaluate(bestAngles, target);

  const restarts = 40;
  const iterations = 250;
  const successThreshold = 0.05;

  for (let r = 0; r < restarts; r++) {
    let currentAngles = randomAngles();
    let currentEval = evaluate(currentAngles, target);

    let stepSize = 25;

    for (let i = 0; i < iterations; i++) {
      const candidateAngles = mutateAngles(currentAngles, stepSize);
      const candidateEval = evaluate(candidateAngles, target);

      if (candidateEval.error < currentEval.error) {
        currentAngles = candidateAngles;
        currentEval = candidateEval;
      }

      if (currentEval.error < bestEval.error) {
        bestAngles = currentAngles;
        bestEval = currentEval;
      }

      stepSize *= 0.985;

      if (bestEval.error < successThreshold) {
        return {
          angles: bestAngles,
          position: bestEval.position,
          error: bestEval.error,
          success: true,
        };
      }
    }
  }

  return {
    angles: bestAngles,
    position: bestEval.position,
    error: bestEval.error,
    success: bestEval.error < successThreshold,
  };
}