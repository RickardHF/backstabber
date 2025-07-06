import React, { useRef, useEffect, useState } from 'react';

interface MobileControlsProps {
  onMovement: (direction: { x: number; y: number }) => void;
  onAttack: () => void;
  isVisible: boolean;
  attackCooldown: boolean;
  isPlayerDead: boolean;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  fullscreenSupported?: boolean;
}

interface JoystickProps {
  onMove: (direction: { x: number; y: number }) => void;
  size: number;
}

const Joystick: React.FC<JoystickProps> = ({ onMove, size }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [touchId, setTouchId] = useState<number | null>(null);
  
  // Responsive size based on screen orientation
  const [responsiveSize, setResponsiveSize] = useState(size);
  
  useEffect(() => {
    const updateSize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isSmallHeight = window.innerHeight < 600;
      
      if (isLandscape && isSmallHeight) {
        setResponsiveSize(Math.min(size * 0.7, 70)); // Smaller in landscape
      } else {
        setResponsiveSize(size);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [size]);
  
  const maxDistance = responsiveSize / 2 - 20; // 20px is half the knob size
    const handleStart = (clientX: number, clientY: number, touchIdentifier?: number) => {
    setIsDragging(true);
    if (touchIdentifier !== undefined) {
      setTouchId(touchIdentifier);
    }
    handleMove(clientX, clientY);
  };
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!joystickRef.current || !isDragging) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);
    
    // Limit the distance to the maximum allowed
    const limitedDistance = Math.min(distance, maxDistance);
    
    const newX = Math.cos(angle) * limitedDistance;
    const newY = Math.sin(angle) * limitedDistance;
    
    setPosition({ x: newX, y: newY });
    
    // Normalize the values for the game logic
    const normalizedX = newX / maxDistance;
    const normalizedY = newY / maxDistance;
    
    onMove({ x: normalizedX, y: normalizedY });
  };
    const handleEnd = () => {
    setIsDragging(false);
    setTouchId(null);
    setPosition({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };
  
  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };
  
  const handleMouseUp = () => {
    handleEnd();
  };
    // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isDragging) return; // Already tracking a touch
    
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY, touch.identifier);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!isDragging || touchId === null) return;
    
    // Find the touch with the matching identifier
    const touch = Array.from(e.touches).find(t => t.identifier === touchId);
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (!isDragging || touchId === null) return;
    
    // Check if our tracked touch was removed
    const touchStillActive = Array.from(e.touches).some(t => t.identifier === touchId);
    if (!touchStillActive) {
      handleEnd();
    }
  };
    useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, touchId]);
  
  return (
    <div
      ref={joystickRef}      className="relative bg-gray-800 bg-opacity-50 border-2 border-gray-600 rounded-full select-none mobile-joystick"
      style={{
        width: responsiveSize,
        height: responsiveSize,
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        ref={knobRef}
        className="absolute bg-white border-2 border-gray-400 rounded-full shadow-lg transition-transform"
        style={{
          width: 40,
          height: 40,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
    </div>
  );
};

const MobileControls: React.FC<MobileControlsProps> = ({
  onMovement,
  onAttack,
  isVisible,
  attackCooldown,
  isPlayerDead,
  isFullscreen,
}) => {
  
  if (!isVisible) return null;    return (
    <div className="fixed bottom-2 md:bottom-4 left-0 right-0 flex justify-between items-end px-2 md:px-4 pointer-events-none z-50 safe-area-inset mobile-controls">
      {/* Joystick */}      <div className="pointer-events-auto" style={{ touchAction: 'none' }}>        <Joystick 
          onMove={onMovement} 
          size={80}
        />
        {!isFullscreen && (
          <div className="text-center mt-1 md:mt-2 text-white text-xs md:text-sm font-medium drop-shadow-lg">
            Move
          </div>
        )}
      </div>
      
      {/* Attack Button */}
      <div className="pointer-events-auto" style={{ touchAction: 'manipulation' }}>        <button
        />
        <div className="text-center mt-1 md:mt-2 text-white text-xs md:text-sm font-medium drop-shadow-lg">
          Move
        </div>
      </div>
      
      {/* Attack Button */}
      <div className="pointer-events-auto" style={{ touchAction: 'manipulation' }}>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (!attackCooldown && !isPlayerDead) {
              onAttack();
            }
          }}
          disabled={attackCooldown || isPlayerDead}          className={`
            w-12 h-12 md:w-16 md:h-16 rounded-full text-white font-bold text-base md:text-lg shadow-lg border-2 transition-all mobile-attack-button
            ${attackCooldown || isPlayerDead
              ? 'bg-gray-500 border-gray-400 cursor-not-allowed opacity-50'
              : 'bg-red-600 border-red-400 hover:bg-red-700 active:bg-red-800 active:scale-95'
            }
          `}
          style={{ touchAction: 'manipulation' }}        >
          ⚔️
        </button>
        {!isFullscreen && (
          <div className="text-center mt-1 md:mt-2 text-white text-xs md:text-sm font-medium drop-shadow-lg">
            Attack
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileControls;
