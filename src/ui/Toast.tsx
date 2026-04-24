import { useEffect } from 'react';
import { usePlanetStore } from '@/store/usePlanetStore';

export function Toast() {
  const message = usePlanetStore((s) => s.toastMessage);
  const clearToast = usePlanetStore((s) => s.clearToast);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clearToast, 2500);
    return () => clearTimeout(timer);
  }, [message, clearToast]);

  if (!message) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white shadow-lg animate-fade-in">
      {message}
    </div>
  );
}
