"use client";

import { Suspense, Component, type ReactNode, useState, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Bounds, Center, ContactShadows, Html, Line } from "@react-three/drei";
import { Vector3, PerspectiveCamera as PerspectiveCameraType, WebGLRenderer } from "three";
import { metersToUnit, unitLabel } from "@/lib/units";

// --- Icons ---
const TopIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" y="3"/><circle cx="12" cy="12" r="2"/></svg>;
const FrontIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" y="3"/><path d="M3 15h18"/></svg>;
const PerspectiveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const ResetIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const MeasureIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v4"/><path d="M11 8v4"/><path d="M15 8v4"/></svg>;
const ScreenshotIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const FullscreenIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
const ExitFullscreenIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>;

function Model({ url, onPointerDown }: { url: string; onPointerDown?: (e: any) => void }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} onPointerDown={onPointerDown} />;
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-lg bg-border animate-pulse" />
        <p className="whitespace-nowrap text-xs text-muted">Loading 3D model…</p>
      </div>
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

export function ModelViewer({ 
  url, 
  unitSystem = "metric" 
}: { 
  url: string; 
  unitSystem?: "metric" | "imperial";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<PerspectiveCameraType | null>(null);
  const controlsRef = useRef<any>(null);
  const glRef = useRef<WebGLRenderer | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Vector3[]>([]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleScreenshot = () => {
    if (glRef.current) {
      const link = document.createElement('a');
      link.download = 'model-screenshot.png';
      link.href = glRef.current.domElement.toDataURL('image/png');
      link.click();
    }
  };

  const setView = (pos: [number, number, number]) => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...pos);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handlePointerDown = (e: any) => {
    if (!isMeasuring) return;
    e.stopPropagation();
    if (measurePoints.length >= 2) {
      setMeasurePoints([e.point]);
    } else {
      setMeasurePoints(prev => [...prev, e.point]);
    }
  };

  const toggleMeasuring = () => {
    setIsMeasuring(prev => !prev);
    if (isMeasuring) {
      setMeasurePoints([]); // clear points when turning off
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden rounded-lg border border-border bg-surface ${isFullscreen ? 'h-screen' : 'h-96'}`}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-lg bg-surface/80 backdrop-blur-sm p-1.5 shadow-sm border border-border">
        {/* View Presets */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5">
           <button onClick={() => setView([0, 10, 0])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Top"><TopIcon/> <span className="hidden sm:inline">Top</span></button>
           <button onClick={() => setView([0, 0, 10])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Front"><FrontIcon/> <span className="hidden sm:inline">Front</span></button>
           <button onClick={() => setView([6, 6, 6])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Perspective"><PerspectiveIcon/> <span className="hidden sm:inline">Perspective</span></button>
           <button onClick={() => setView([6, 6, 6])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Reset"><ResetIcon/> <span className="hidden sm:inline">Reset</span></button>
        </div>
        
        {/* Tools */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 pl-1">
           <button onClick={toggleMeasuring} className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${isMeasuring ? 'bg-accent/10 text-accent' : 'hover:bg-accent/10 hover:text-accent'}`} title="Measure">
             <MeasureIcon/> <span className="hidden sm:inline">Measure</span>
           </button>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-0.5 pl-1">
           <button onClick={handleScreenshot} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Screenshot"><ScreenshotIcon/> <span className="hidden sm:inline">Screenshot</span></button>
           <button onClick={toggleFullscreen} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Fullscreen">
             {isFullscreen ? <><ExitFullscreenIcon/> <span className="hidden sm:inline">Exit</span></> : <><FullscreenIcon/> <span className="hidden sm:inline">Fullscreen</span></>}
           </button>
        </div>
      </div>

      <Canvas 
        camera={{ position: [6, 6, 6], fov: 45 }} 
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl, camera }) => {
          glRef.current = gl;
          cameraRef.current = camera as PerspectiveCameraType;
        }}
      >
        <color attach="background" args={["#f5f2ec"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <ViewerErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Bounds fit clip observe margin={1.3}>
              <Center>
                <Model url={url} onPointerDown={handlePointerDown} />
              </Center>
            </Bounds>
            {measurePoints.length === 2 && (
              <>
                <Line points={[measurePoints[0], measurePoints[1]]} color="#a15c3e" lineWidth={4} />
                <Html position={measurePoints[0].clone().lerp(measurePoints[1], 0.5)} center>
                  <div className="bg-surface/90 backdrop-blur px-2 py-1 rounded text-xs border border-border shadow-sm font-mono whitespace-nowrap text-foreground pointer-events-none">
                    {metersToUnit(measurePoints[0].distanceTo(measurePoints[1]), unitSystem).toFixed(2)} {unitLabel(unitSystem)}
                  </div>
                </Html>
              </>
            )}
            <Environment preset="apartment" />
            <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={12} blur={2} far={10} />
          </Suspense>
        </ViewerErrorBoundary>
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={40} />
      </Canvas>
    </div>
  );
}
