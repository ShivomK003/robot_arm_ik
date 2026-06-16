import { useMemo, useEffect } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { generateWorkspaceSamples, type WorkspacePoint } from "../utils/workspace";

type WorkspaceCloudProps = {
  sampleCount?: number;
  visible?: boolean;
  onSamplesGenerated?: (samples: WorkspacePoint[]) => void;
};

export default function WorkspaceCloud({
  sampleCount = 5000,
  visible = true,
  onSamplesGenerated,
}: WorkspaceCloudProps) {
  const samples = useMemo(() => {
    return generateWorkspaceSamples(sampleCount);
  }, [sampleCount]);

  const geometry = useMemo(() => {
    const vertices: number[] = [];

    for (const sample of samples) {
      vertices.push(sample.position.x, sample.position.y, sample.position.z);
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));

    return geo;
  }, [samples]);

  useEffect(() => {
    onSamplesGenerated?.(samples);
  }, [samples, onSamplesGenerated]);

  if (!visible) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.018} />
    </points>
  );
}