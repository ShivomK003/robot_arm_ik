import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Leva, useControls } from "leva";
import { useRef, useState } from "react";
import type { Group } from "three";
import { Vector3 } from "three";

import RobotArm from "./components/RobotArm";

import { computeForwardKinematics } from "./utils/forwardKinematics";
import "./App.css";

function Scene({
  jointAngles,
  onEndEffectorUpdate,
}: {
  jointAngles: number[];
  onEndEffectorUpdate: (position: Vector3) => void;
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

      <RobotArm ref={endEffectorRef} jointAngles={jointAngles} />

      <OrbitControls />
    </>
  );
}

export default function App() {
  const joints = useControls("Joint Angles", {
    j1_baseYaw: { value: 0, min: -180, max: 180, step: 1 },
    j2_shoulderPitch: { value: 20, min: -20, max: 140, step: 1 },
    j3_elbowPitch: { value: -30, min: -150, max: 0, step: 1 },
    j4_wristPitch: { value: 0, min: -90, max: 90, step: 1 },
    j5_wristYaw: { value: 0, min: -90, max: 90, step: 1 },
    j6_wristRoll: { value: 0, min: -180, max: 180, step: 1 },
  });

  const jointAngles = [
    joints.j1_baseYaw,
    joints.j2_shoulderPitch,
    joints.j3_elbowPitch,
    joints.j4_wristPitch,
    joints.j5_wristYaw,
    joints.j6_wristRoll,
  ];

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
      </div>

      <Canvas shadows>
        <Scene
          jointAngles={jointAngles}
          onEndEffectorUpdate={setEePosition}
        />
      </Canvas>
    </div>
  );
}