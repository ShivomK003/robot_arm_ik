import { Matrix4, Vector3, Euler, Quaternion } from "three";
import { ROBOT_DIMENSIONS } from "./constants";

import { radToDeg, degToRad} from "./utilityfns";

export type FKResult = {
  position: Vector3;
  transform: Matrix4;
  rotationEuler: Euler;
  rotationDegrees: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  quaternion: Quaternion;
};


function rotationMatrix(x: number, y: number, z: number) {
  const matrix = new Matrix4();
  matrix.makeRotationFromEuler(new Euler(x, y, z, "XYZ"));
  return matrix;
}

function translationMatrix(x: number, y: number, z: number) {
  const matrix = new Matrix4();
  matrix.makeTranslation(x, y, z);
  return matrix;
}

export function computeForwardKinematics(jointAnglesDeg: number[]): FKResult {
  const [j1, j2, j3, j4, j5, j6] = jointAnglesDeg.map(degToRad);

  const {
    BASE_HEIGHT,
    UPPER_ARM_LENGTH,
    FOREARM_LENGTH,
    WRIST_LENGTH,
    TOOL_LENGTH,
    TCP_OFFSET,
  } = ROBOT_DIMENSIONS;

  let T = new Matrix4().identity();

  T = T.multiply(translationMatrix(0, BASE_HEIGHT, 0));
  T = T.multiply(rotationMatrix(0, j1, 0));
  T = T.multiply(rotationMatrix(0, 0, j2));
  T = T.multiply(translationMatrix(UPPER_ARM_LENGTH, 0, 0));
  T = T.multiply(rotationMatrix(0, 0, j3));
  T = T.multiply(translationMatrix(FOREARM_LENGTH, 0, 0));
  T = T.multiply(rotationMatrix(0, 0, j4));
  T = T.multiply(translationMatrix(WRIST_LENGTH, 0, 0));
  T = T.multiply(rotationMatrix(0, j5, 0));
  T = T.multiply(translationMatrix(TOOL_LENGTH, 0, 0));
  T = T.multiply(rotationMatrix(j6, 0, 0));
  T = T.multiply(translationMatrix(TCP_OFFSET, 0, 0));

  const position = new Vector3();
  position.setFromMatrixPosition(T);

  const rotationMatrixOnly = T.clone();
  rotationMatrixOnly.setPosition(0, 0, 0);

  const quaternion = new Quaternion();
  quaternion.setFromRotationMatrix(rotationMatrixOnly);

  const rotationEuler = new Euler();
  rotationEuler.setFromQuaternion(quaternion, "XYZ");

  const rotationDegrees = {
    roll: radToDeg(rotationEuler.x),
    pitch: radToDeg(rotationEuler.y),
    yaw: radToDeg(rotationEuler.z),
  };

  return {
    position,
    transform: T,
    rotationEuler,
    rotationDegrees,
    quaternion,
  };
}