import { forwardRef } from "react";
import type { Group } from "three";

import Joint from "./Joint";
import Link from "./Link";

import { ROBOT_DIMENSIONS } from "../utils/constants";
import { degToRad } from "../utils/utilityfns";

type RobotArmProps = {
  jointAngles: number[];
};



function RobotArm({ jointAngles }: RobotArmProps, endEffectorRef: React.Ref<Group>) {
  const [j1, j2, j3, j4, j5, j6] = jointAngles.map(degToRad);

  const {
    BASE_HEIGHT,
    UPPER_ARM_LENGTH,
    FOREARM_LENGTH,
    WRIST_LENGTH,
    TOOL_LENGTH,
  } = ROBOT_DIMENSIONS;

  return (
    <group position={[0, 0, 0]}>
      {/* Base */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, BASE_HEIGHT, 48]} />
        <meshStandardMaterial color="#444444" />
      </mesh>

      {/* Joint 1: Base Yaw */}
      <group position={[0, BASE_HEIGHT, 0]} rotation={[0, j1, 0]}>
        <axesHelper args={[0.35]} />
        <Joint color="#ff5555" />

        {/* Joint 2: Shoulder Pitch */}
        <group rotation={[0, 0, j2]}>
          <axesHelper args={[0.3]} />
          <Link length={UPPER_ARM_LENGTH} radius={0.06} color="#4da6ff" />

          <group position={[UPPER_ARM_LENGTH, 0, 0]}>
            <axesHelper args={[0.3]} />
            <Joint color="#ffaa00" />

            {/* Joint 3: Elbow Pitch */}
            <group rotation={[0, 0, j3]}>
              <Link length={FOREARM_LENGTH} radius={0.055} color="#4da6ff" />

              <group position={[FOREARM_LENGTH, 0, 0]}>
                <axesHelper args={[0.25]} />
                <Joint color="#ffaa00" />

                {/* Joint 4: Wrist Pitch */}
                <group rotation={[0, 0, j4]}>
                  <Link length={WRIST_LENGTH} radius={0.045} color="#77dd77" />

                  <group position={[WRIST_LENGTH, 0, 0]}>
                    <axesHelper args={[0.22]} />
                    <Joint color="#cc66ff" />

                    {/* Joint 5: Wrist Yaw */}
                    <group rotation={[0, j5, 0]}>
                      <Link length={TOOL_LENGTH} radius={0.035} color="#77dd77" />

                      <group position={[TOOL_LENGTH, 0, 0]}>
                        <axesHelper args={[0.2]} />
                        <Joint color="#cc66ff" />

                        {/* Joint 6: Wrist Roll */}
                        <group rotation={[j6, 0, 0]}>
                          <axesHelper args={[0.2]} />

                          {/* Gripper base */}
                          <mesh position={[0.18, 0, 0]} castShadow>
                            <boxGeometry args={[0.36, 0.08, 0.08]} />
                            <meshStandardMaterial color="#ffffff" />
                          </mesh>

                          {/* Upper finger */}
                          <mesh position={[0.38, 0.08, 0]} castShadow>
                            <boxGeometry args={[0.18, 0.04, 0.04]} />
                            <meshStandardMaterial color="#ffffff" />
                          </mesh>

                          {/* Lower finger */}
                          <mesh position={[0.38, -0.08, 0]} castShadow>
                            <boxGeometry args={[0.18, 0.04, 0.04]} />
                            <meshStandardMaterial color="#ffffff" />
                          </mesh>

                          {/* End Effector Marker */}
                          <group ref={endEffectorRef} position={[0.5, 0, 0]}>
                            <mesh>
                              <sphereGeometry args={[0.045, 24, 24]} />
                              <meshStandardMaterial color="#00ff88" />
                            </mesh>
                          </group>
                        </group>
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default forwardRef(RobotArm);