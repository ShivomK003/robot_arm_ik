import { Vector3 } from "three";

type TargetMarkerProps = {
  position: Vector3;
  reachable: boolean;
};

export default function TargetMarker({ position, reachable }: TargetMarkerProps) {
  return (
    <mesh position={[position.x, position.y, position.z]}>
      <axesHelper args={[0.2]} />
      <sphereGeometry args={[0.09, 32, 32]} />
      <meshStandardMaterial color={reachable ? "#00ff88" : "#ff4444"} />
    </mesh>
  );
}