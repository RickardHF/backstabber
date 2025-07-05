import { useState, useEffect } from 'react';

interface OrientationState {
  isLandscape: boolean;
  isPortrait: boolean;
  orientation: 'landscape' | 'portrait';
  angle: number;
}

export const useOrientation = (): OrientationState => {
  const [orientation, setOrientation] = useState<OrientationState>({
    isLandscape: false,
    isPortrait: true,
    orientation: 'portrait',
    angle: 0
  });

  useEffect(() => {
    const updateOrientation = () => {
      const angle = (screen.orientation?.angle) || (window.orientation as number) || 0;
      const isLandscape = window.innerWidth > window.innerHeight;
      const isPortrait = !isLandscape;
      
      setOrientation({
        isLandscape,
        isPortrait,
        orientation: isLandscape ? 'landscape' : 'portrait',
        angle
      });
    };

    // Initial check
    updateOrientation();

    // Listen for orientation changes
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  return orientation;
};
