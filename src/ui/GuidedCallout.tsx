import { useEffect, useState } from 'react';
import { usePlanetStore } from '@/store/usePlanetStore';

interface GuidedCalloutProps {
  /** Only show after the user clicks "Show me" in the welcome modal */
  enabled: boolean;
}

export function GuidedCallout({ enabled }: GuidedCalloutProps) {
  const [dismissed, setDismissed] = useState(false);
  const version = usePlanetStore((s) => s.version);

  // Dismiss after first stroke (version increments from 0)
  useEffect(() => {
    if (version > 0) {
      setDismissed(true);
    }
  }, [version]);

  if (!enabled || dismissed) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur text-white text-sm px-4 py-2 rounded-lg shadow-lg z-30 pointer-events-none">
      Click and drag here to raise terrain
    </div>
  );
}
