"use client";

import { Suspense, Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Bounds, Center, ContactShadows, Html } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function Loader() {
  return (
    <Html center>
      <p className="whitespace-nowrap text-xs text-muted">Loading model…</p>
    </Html>
  );
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <p className="whitespace-nowrap text-xs text-danger">Couldn&apos;t display this model</p>
        </Html>
      );
    }
    return this.props.children;
  }
}

export function ModelViewer({ url }: { url: string }) {
  return (
    <div className="h-96 w-full overflow-hidden rounded-lg border border-border bg-surface">
      <Canvas camera={{ position: [6, 6, 6], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={["#f5f2ec"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <ViewerErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Bounds fit clip observe margin={1.3}>
              <Center>
                <Model url={url} />
              </Center>
            </Bounds>
            <Environment preset="apartment" />
            <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={12} blur={2} far={10} />
          </Suspense>
        </ViewerErrorBoundary>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={40} />
      </Canvas>
    </div>
  );
}
