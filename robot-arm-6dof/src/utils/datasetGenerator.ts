import { computeForwardKinematics } from "./forwardKinematics";
import { JOINT_LIMITS } from "./constants";

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomJointAngles() {
  const limits = Object.values(JOINT_LIMITS);

  return limits.map((limit) => randomBetween(limit.min, limit.max));
}

function normalizeQuaternionSign(q: {
  x: number;
  y: number;
  z: number;
  w: number;
}) {
  if (q.w < 0) {
    return {
      x: -q.x,
      y: -q.y,
      z: -q.z,
      w: -q.w,
    };
  }

  return q;
}

export function generateRobotDataset(sampleCount: number) {
  const rows: string[] = [];

  rows.push("x,y,z,qx,qy,qz,qw,j1,j2,j3,j4,j5,j6");

  for (let i = 0; i < sampleCount; i++) {
    const jointAngles = randomJointAngles();

    const fk = computeForwardKinematics(jointAngles);

    const q = normalizeQuaternionSign(fk.quaternion);

    const row = [
      fk.position.x,
      fk.position.y,
      fk.position.z,
      q.x,
      q.y,
      q.z,
      q.w,
      ...jointAngles,
    ];

    rows.push(row.map((value) => value.toFixed(8)).join(","));
  }

  return rows.join("\n");
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}