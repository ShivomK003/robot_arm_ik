import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Leva, useControls } from "leva";
import { useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Euler, Quaternion, Vector3 } from "three";
import axios from "axios";

import RobotArm from "./components/RobotArm";
import WorkspaceCloud from "./components/WorkspaceCloud";
import TargetMarker from "./components/TargetMarker";

import {
  generateRobotDataset,
  downloadCSV,
} from "./utils/datasetGenerator";

import {
  findNearestWorkspacePoint,
  type WorkspacePoint,
} from "./utils/workspace";

import { JOINT_LIMITS } from "./utils/constants";
import { computeForwardKinematics } from "./utils/forwardKinematics";
import { solveIK, type IKResult } from "./utils/inverseKinematics";

import "./App.css";

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function normalizeQuaternion(q: Quaternion) {
  if (q.w < 0) {
    q.x *= -1;
    q.y *= -1;
    q.z *= -1;
    q.w *= -1;
  }

  return q;
}

function lerpAngleDeg(current: number, target: number, alpha: number) {
  const diff = ((target - current + 540) % 360) - 180;
  return current + diff * alpha;
}

function Scene({
  targetJointAngles,
  onEndEffectorUpdate,
  onAnimatedAnglesUpdate,
  showWorkspace,
  workspaceSampleCount,
  onSamplesGenerated,
  targetPosition,
  targetReachable,
}: {
  targetJointAngles: number[];
  onEndEffectorUpdate: (position: Vector3) => void;
  onAnimatedAnglesUpdate: (angles: number[]) => void;
  showWorkspace: boolean;
  workspaceSampleCount: number;
  onSamplesGenerated: (samples: WorkspacePoint[]) => void;
  targetPosition: Vector3;
  targetReachable: boolean;
}) {
  const endEffectorRef = useRef<Group>(null);
  const currentAnglesRef = useRef<number[]>([...targetJointAngles]);
  const [animatedJointAngles, setAnimatedJointAngles] = useState<number[]>([
    ...targetJointAngles,
  ]);

  useFrame((_, delta) => {
    const speed = 4.5;
    const alpha = 1 - Math.exp(-speed * delta);

    const nextAngles = currentAnglesRef.current.map((current, i) => {
      const target = targetJointAngles[i];
      const next = lerpAngleDeg(current, target, alpha);

      if (Math.abs(target - next) < 0.001) {
        return target;
      }

      return next;
    });

    currentAnglesRef.current = nextAngles;
    setAnimatedJointAngles(nextAngles);
    onAnimatedAnglesUpdate(nextAngles);

    if (!endEffectorRef.current) return;

    const position = new Vector3();
    endEffectorRef.current.getWorldPosition(position);
    onEndEffectorUpdate(position);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[4, 3, 5]} fov={50} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} castShadow />

      <gridHelper args={[8, 20]} />
      <axesHelper args={[2]} />

      <WorkspaceCloud
        visible={showWorkspace}
        sampleCount={workspaceSampleCount}
        onSamplesGenerated={onSamplesGenerated}
      />

      <TargetMarker position={targetPosition} reachable={targetReachable} />

      <RobotArm ref={endEffectorRef} jointAngles={animatedJointAngles} />

      <OrbitControls />
    </>
  );
}

export default function App() {
  const joints = useControls("Joint Angles", {
    j1_baseYaw: {
      value: 0,
      min: JOINT_LIMITS.j1_baseYaw.min,
      max: JOINT_LIMITS.j1_baseYaw.max,
      step: 1,
    },
    j2_shoulderPitch: {
      value: 20,
      min: JOINT_LIMITS.j2_shoulderPitch.min,
      max: JOINT_LIMITS.j2_shoulderPitch.max,
      step: 1,
    },
    j3_elbowPitch: {
      value: -30,
      min: JOINT_LIMITS.j3_elbowPitch.min,
      max: JOINT_LIMITS.j3_elbowPitch.max,
      step: 1,
    },
    j4_wristPitch: {
      value: 0,
      min: JOINT_LIMITS.j4_wristPitch.min,
      max: JOINT_LIMITS.j4_wristPitch.max,
      step: 1,
    },
    j5_wristYaw: {
      value: 0,
      min: JOINT_LIMITS.j5_wristYaw.min,
      max: JOINT_LIMITS.j5_wristYaw.max,
      step: 1,
    },
    j6_wristRoll: {
      value: 0,
      min: JOINT_LIMITS.j6_wristRoll.min,
      max: JOINT_LIMITS.j6_wristRoll.max,
      step: 1,
    },
  });

  const manualJointAngles = [
    joints.j1_baseYaw,
    joints.j2_shoulderPitch,
    joints.j3_elbowPitch,
    joints.j4_wristPitch,
    joints.j5_wristYaw,
    joints.j6_wristRoll,
  ];

  const workspace = useControls("Workspace", {
    showWorkspace: true,
    sampleCount: {
      value: 5000,
      min: 1000,
      max: 50000,
      step: 1000,
    },
  });

  const targetControls = useControls("Target Position", {
    x: { value: 1.5, min: -3.5, max: 3.5, step: 0.05 },
    y: { value: 0.8, min: -2.5, max: 3.5, step: 0.05 },
    z: { value: 0.5, min: -3.5, max: 3.5, step: 0.05 },
  });

  const targetOrientationControls = useControls("Target Orientation", {
    roll: { value: 0, min: -180, max: 180, step: 1 },
    pitch: { value: 0, min: -180, max: 180, step: 1 },
    yaw: { value: 0, min: -180, max: 180, step: 1 },
  });

  const datasetControls = useControls("Dataset", {
    sampleCount: {
      value: 10000,
      min: 1000,
      max: 100000,
      step: 1000,
    },
  });

  const [workspaceSamples, setWorkspaceSamples] = useState<WorkspacePoint[]>([]);
  const [eePosition, setEePosition] = useState(new Vector3());
  const [ikAngles, setIkAngles] = useState<number[] | null>(null);
  const [ikResult, setIkResult] = useState<IKResult | null>(null);
  const [displayedJointAngles, setDisplayedJointAngles] =
    useState<number[]>(manualJointAngles);

  const targetJointAngles = ikAngles ?? manualJointAngles;

  const targetPosition = useMemo(
    () => new Vector3(targetControls.x, targetControls.y, targetControls.z),
    [targetControls.x, targetControls.y, targetControls.z]
  );

  const targetQuaternion = useMemo(() => {
    const euler = new Euler(
      degToRad(targetOrientationControls.roll),
      degToRad(targetOrientationControls.pitch),
      degToRad(targetOrientationControls.yaw),
      "XYZ"
    );

    return normalizeQuaternion(new Quaternion().setFromEuler(euler));
  }, [
    targetOrientationControls.roll,
    targetOrientationControls.pitch,
    targetOrientationControls.yaw,
  ]);

  const nearestInfo = useMemo(() => {
    if (workspaceSamples.length === 0) return null;
    return findNearestWorkspacePoint(targetPosition, workspaceSamples);
  }, [targetPosition, workspaceSamples]);

  const REACHABILITY_THRESHOLD = 0.15;

  const targetReachable =
    nearestInfo !== null && nearestInfo.distance < REACHABILITY_THRESHOLD;

  const fkResult = computeForwardKinematics(displayedJointAngles);

  const nnInputPreview = [
    targetPosition.x,
    targetPosition.y,
    targetPosition.z,
    targetQuaternion.x,
    targetQuaternion.y,
    targetQuaternion.z,
    targetQuaternion.w,
    ...displayedJointAngles,
  ];

  return (
    <div className="app">
      <Leva collapsed={false} />

      <div className="fk-panel">
        <h3>End Effector Position</h3>

        <h4>Three.js FK</h4>
        <p>X: {eePosition.x.toFixed(3)}</p>
        <p>Y: {eePosition.y.toFixed(3)}</p>
        <p>Z: {eePosition.z.toFixed(3)}</p>

        <h4>Custom FK</h4>
        <p>X: {fkResult.position.x.toFixed(3)}</p>
        <p>Y: {fkResult.position.y.toFixed(3)}</p>
        <p>Z: {fkResult.position.z.toFixed(3)}</p>

        <h4>TCP Orientation</h4>
        <p>Roll: {fkResult.rotationDegrees.roll.toFixed(2)}°</p>
        <p>Pitch: {fkResult.rotationDegrees.pitch.toFixed(2)}°</p>
        <p>Yaw: {fkResult.rotationDegrees.yaw.toFixed(2)}°</p>

        <h4>FK Validation Error</h4>
        <p>{eePosition.distanceTo(fkResult.position).toFixed(6)}</p>

        <h3>Target Position</h3>
        <p>X: {targetPosition.x.toFixed(3)}</p>
        <p>Y: {targetPosition.y.toFixed(3)}</p>
        <p>Z: {targetPosition.z.toFixed(3)}</p>

        <h4>Target Orientation</h4>
        <p>Roll: {targetOrientationControls.roll.toFixed(2)}°</p>
        <p>Pitch: {targetOrientationControls.pitch.toFixed(2)}°</p>
        <p>Yaw: {targetOrientationControls.yaw.toFixed(2)}°</p>

        <h4>Target Quaternion</h4>
        <p>qx: {targetQuaternion.x.toFixed(3)}</p>
        <p>qy: {targetQuaternion.y.toFixed(3)}</p>
        <p>qz: {targetQuaternion.z.toFixed(3)}</p>
        <p>qw: {targetQuaternion.w.toFixed(3)}</p>

        <h4>Reachability</h4>
        <p>{targetReachable ? "Reachable ✅" : "Unreachable ❌"}</p>
        <p>
          Nearest Distance:{" "}
          {nearestInfo ? nearestInfo.distance.toFixed(4) : "Loading..."}
        </p>

        <button
          className="solve-button"
          onClick={() => {
            const result = solveIK({
              position: targetPosition,
              quaternion: targetQuaternion,
            });

            setIkAngles(result.angles);
            setIkResult(result);
            console.log(result);
          }}
        >
          Solve IK
        </button>

        <button
          className="solve-button"
          onClick={async () => {
            let currentAngles = [...displayedJointAngles];

            const refinementSteps = 8;

            for (let i = 0; i < refinementSteps; i++) {
              const response = await axios.post("http://127.0.0.1:8000/predict", {
                target_position: [
                  targetPosition.x,
                  targetPosition.y,
                  targetPosition.z,
                ],
                target_quaternion: [
                  targetQuaternion.x,
                  targetQuaternion.y,
                  targetQuaternion.z,
                  targetQuaternion.w,
                ],
                current_joint_angles: currentAngles,
              });

              currentAngles = response.data.angles_array;
            }

            setIkAngles(currentAngles);

            console.log("Refined Neural IK prediction:", currentAngles);
          }}
        >
          Solve with Neural IK Refinement
        </button>

        <button
          className="solve-button"
          onClick={() => {
            setIkAngles(null);
            setIkResult(null);
          }}
        >
          Reset to Manual Controls
        </button>

        <h4>IK Result</h4>
        <p>
          {ikResult
            ? ikResult.success
              ? "Success ✅"
              : "Failed ❌"
            : "Not solved yet"}
        </p>
        <p>
          Position Error:{" "}
          {ikResult ? ikResult.positionError.toFixed(4) : "-"}
        </p>
        <p>
          Orientation Error:{" "}
          {ikResult ? ikResult.orientationError.toFixed(4) : "-"}
        </p>
        <p>Total Error: {ikResult ? ikResult.totalError.toFixed(4) : "-"}</p>

        <h3>NN Input Preview</h3>
        <p>Length: {nnInputPreview.length}</p>
        <p>[{nnInputPreview.map((v) => v.toFixed(3)).join(", ")}]</p>

        <h3>Dataset</h3>
        <p>Samples: {datasetControls.sampleCount}</p>

        <button
          className="solve-button"
          onClick={() => {
            const csv = generateRobotDataset(datasetControls.sampleCount);
            downloadCSV(
              csv,
              `robot_6dof_dataset_${datasetControls.sampleCount}.csv`
            );
          }}
        >
          Generate Dataset
        </button>
      </div>

      <Canvas shadows>
        <Scene
          targetJointAngles={targetJointAngles}
          onAnimatedAnglesUpdate={setDisplayedJointAngles}
          onEndEffectorUpdate={setEePosition}
          showWorkspace={workspace.showWorkspace}
          workspaceSampleCount={workspace.sampleCount}
          onSamplesGenerated={setWorkspaceSamples}
          targetPosition={targetPosition}
          targetReachable={targetReachable}
        />
      </Canvas>
    </div>
  );
}