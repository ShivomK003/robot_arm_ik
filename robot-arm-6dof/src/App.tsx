import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Leva, useControls } from "leva";
import RobotArm from "./components/RobotArm";
import "./App.css";

export default function App() {
  const joints = useControls("Joint Angles", {
    j1_baseYaw: { value: 0, min: -180, max: 180, step: 1 },
    j2_shoulderPitch: { value: 20, min: -20, max: 140, step: 1 },
    j3_elbowPitch: { value: -30, min: -150, max: 0, step: 1 },
    j4_wristPitch: { value: 0, min: -90, max: 90, step: 1 },
    j5_wristYaw: { value: 0, min: -90, max: 90, step: 1 },
    j6_wristRoll: { value: 0, min: -180, max: 180, step: 1 },
  });

  return (
    <div className="app">
      <Leva collapsed={false} />

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[4, 3, 5]} fov={50} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 3]} intensity={1.2} castShadow />

        <gridHelper args={[8, 20]} />
        <axesHelper args={[2]} />

        <RobotArm
          jointAngles={[
            joints.j1_baseYaw,
            joints.j2_shoulderPitch,
            joints.j3_elbowPitch,
            joints.j4_wristPitch,
            joints.j5_wristYaw,
            joints.j6_wristRoll,
          ]}
        />

        <OrbitControls />
      </Canvas>
    </div>
  );
}