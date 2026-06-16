import { Matrix4, Vector3, Euler } from "three";

import { ROBOT_DIMENSIONS } from "./constants";
import { degToRad } from "./utilityfns";

export type FKResult = {
  position: Vector3;
  transform: Matrix4;
};

function rotationMatrix(x: number, y: number, z: number) {
  const matrix = new Matrix4();
  matrix.makeRotationFromEuler(new Euler(x, y, z));
  return matrix;
};

function translationMatrix(x: number, y: number, z: number) {
  const matrix = new Matrix4();
  matrix.makeTranslation(x, y, z);
  return matrix;
};

export function computeForwardKinematics(jointAnglesDeg: number[]): FKResult {
  const [j1, j2, j3, j4, j5, j6] = jointAnglesDeg.map(degToRad);

  const {
    BASE_HEIGHT,
    UPPER_ARM_LENGTH,
    FOREARM_LENGTH,
    WRIST_LENGTH,
    TOOL_LENGTH,
    TCP_OFFSET
  } = ROBOT_DIMENSIONS;


  let T = new Matrix4().identity();

  // Base height
  T = T.multiply(translationMatrix(0, BASE_HEIGHT, 0));

  // Joint 1: Base Yaw around Y-axis
  T = T.multiply(rotationMatrix(0, j1, 0));

  // Joint 2: Shoulder Pitch around Z-axis
  T = T.multiply(rotationMatrix(0, 0, j2));
  //Link 1
  T = T.multiply(translationMatrix(UPPER_ARM_LENGTH, 0, 0));

  // Joint 3: Elbow Pitch around Z-axis
  T = T.multiply(rotationMatrix(0, 0, j3));
  //Link 2
  T = T.multiply(translationMatrix(FOREARM_LENGTH, 0, 0));

  // Joint 4: Wrist Pitch around Z-axis
  T = T.multiply(rotationMatrix(0, 0, j4));
  // Wrist Link
  T = T.multiply(translationMatrix(WRIST_LENGTH, 0, 0));

  // Joint 5: Wrist Yaw around Y-axis
  T = T.multiply(rotationMatrix(0, j5, 0));
  // Tool Link
  T = T.multiply(translationMatrix(TOOL_LENGTH, 0, 0));

  // Joint 6: Wrist Roll around X-axis
  T = T.multiply(rotationMatrix(j6, 0, 0));

  // TCP Offset
  T = T.multiply(translationMatrix(TCP_OFFSET, 0, 0));

  const position = new Vector3().setFromMatrixPosition(T);

  return {
    position,
    transform: T,
  };
}
