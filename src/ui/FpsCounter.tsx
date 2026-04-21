import { useEffect, useState, useRef } from 'react';
import { SceneManager } from '@/scene/SceneManager';

interface FpsCounterProps {
  sceneManager: SceneManager | null;
  visible: boolean;
}

export function FpsCounter({ sceneManager, visible }: FpsCounterProps) {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!visible || !sceneManager) return;
    // Poll at ~4Hz to avoid React overhead
    const interval = setInterval(() => {
      setFps(sceneManager.getFps());
    }, 250);
    return () => clearInterval(interval);
  }, [sceneManager, visible]);

  if (!visible) return null;

  return (
    <span className="text-[10px] text-gray-500 font-mono tabular-nums">
      FPS: {fps}
    </span>
  );
}
