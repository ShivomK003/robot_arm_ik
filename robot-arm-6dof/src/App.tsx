import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Leva, useControls } from "leva";
import { useRef, useState, useMemo } from "react";
import type { Group } from "three";
import { Vector3 } from "three";

import RobotArm from "./components/RobotArm";
import WorkspaceCloud from "./components/WorkspaceCloud";
import TargetMarker from "./components/TargetMarker";

import { findNearestWorkspacePoint, type WorkspacePoint } from "./utils/workspace";
import { JOINT_LIMITS } from "./utils/constants";
import { computeForwardKinematics } from "./utils/forwardKinematics";
import "./App.css";

function Scene({
  jointAngles,
  onEndEffectorUpdate,
  showWorkspace,
  workspaceSampleCount,
  onSamplesGenerated,
  targetPosition,
  targetReachable,
}: {
  jointAngles: number[];
  onEndEffectorUpdate: (position: Vector3) => void;
  showWorkspace: boolean;
  workspaceSampleCount: number;
  onSamplesGenerated: (samples: WorkspacePoint[]) => void;
  targetPosition: Vector3;
  targetReachable: boolean;
}) {
  const endEffectorRef = useRef<Group>(null);

  useFrame(() => {
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
      <RobotArm ref={endEffectorRef} jointAngles={jointAngles} />

      <OrbitControls />
    </>
  );
}

export default function App() {
  const joints = useControls("Joint Angles", {
    j1_baseYaw: { value: 0, min: JOINT_LIMITS.j1_baseYaw.min, max: JOINT_LIMITS.j1_baseYaw.max, step: 1 },
    j2_shoulderPitch: { value: 20, min: JOINT_LIMITS.j2_shoulderPitch.min, max: JOINT_LIMITS.j2_shoulderPitch.max, step: 1 },
    j3_elbowPitch: { value: -30, min: JOINT_LIMITS.j3_elbowPitch.min, max: JOINT_LIMITS.j3_elbowPitch.max, step: 1 },
    j4_wristPitch: { value: 0, min: JOINT_LIMITS.j4_wristPitch.min, max: JOINT_LIMITS.j4_wristPitch.max, step: 1 },
    j5_wristYaw: { value: 0, min: JOINT_LIMITS.j5_wristYaw.min, max: JOINT_LIMITS.j5_wristYaw.max, step: 1 },
    j6_wristRoll: { value: 0, min: JOINT_LIMITS.j6_wristRoll.min, max: JOINT_LIMITS.j6_wristRoll.max, step: 1 },
  });

  const jointAngles = [
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
  },});

  const [workspaceSamples, setWorkspaceSamples] = useState<WorkspacePoint[]>([]);

  const targetControls = useControls("Target", {
    x: { value: 1.5, min: -3.5, max: 3.5, step: 0.05 },
    y: { value: 0.8, min: -2.5, max: 3.5, step: 0.05 },
    z: { value: 0.5, min: -3.5, max: 3.5, step: 0.05 },
  });
  const targetPosition = useMemo(
    () => new Vector3(targetControls.x, targetControls.y, targetControls.z),
    [targetControls.x, targetControls.y, targetControls.z]
  );

  const nearestInfo = useMemo(() => {
    if (workspaceSamples.length === 0) return null;

    return findNearestWorkspacePoint(targetPosition, workspaceSamples);
  }, [targetPosition, workspaceSamples]);

  const REACHABILITY_THRESHOLD = 0.15;

  const targetReachable =
    nearestInfo !== null && nearestInfo.distance < REACHABILITY_THRESHOLD;


  const fkResult = computeForwardKinematics(jointAngles);

  const [eePosition, setEePosition] = useState(new Vector3());

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

        <h4>Error</h4>
        <p>
          {eePosition.distanceTo(fkResult.position).toFixed(6)}
        </p>

        <h3>Target</h3>
        <p>X: {targetPosition.x.toFixed(3)}</p>
        <p>Y: {targetPosition.y.toFixed(3)}</p>
        <p>Z: {targetPosition.z.toFixed(3)}</p>

        <h4>Reachability</h4>
        <p>{targetReachable ? "Reachable ✅" : "Unreachable ❌"}</p>

        <p>
          Nearest Distance:{" "}
          {nearestInfo ? nearestInfo.distance.toFixed(4) : "Loading..."}
        </p>
      </div>

      <Canvas shadows>
        <Scene
          jointAngles={jointAngles}
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