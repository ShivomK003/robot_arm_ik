export const ROBOT_DIMENSIONS = {
  BASE_HEIGHT: 0.25,
  UPPER_ARM_LENGTH: 1.2,
  FOREARM_LENGTH: 1.0,
  WRIST_LENGTH: 0.45,
  TOOL_LENGTH: 0.35,
  TCP_OFFSET: 0.5,
};

export const JOINT_LIMITS = {
  j1_baseYaw: { min: -180, max: 180 },
  j2_shoulderPitch: { min: -20, max: 140 },
  j3_elbowPitch: { min: -120, max: 0 },
  j4_wristPitch: { min: -90, max: 90 },
  j5_wristYaw: { min: -90, max: 90 },
  j6_wristRoll: { min: -180, max: 180 },
};