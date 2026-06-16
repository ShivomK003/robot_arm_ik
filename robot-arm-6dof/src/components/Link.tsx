type LinkProps = {
  length: number;
  radius?: number;
  color?: string;
};

export default function Link({
  length,
  radius = 0.05,
  color = "#4da6ff",
}: LinkProps) {
  return (
    <mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[radius, radius, length, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}