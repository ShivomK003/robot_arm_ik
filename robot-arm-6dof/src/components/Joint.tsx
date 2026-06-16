type JointProps = {
  color?: string;
};

export default function Joint({ color = "#ff5555" }: JointProps) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.11, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}