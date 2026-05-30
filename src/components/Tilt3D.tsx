import React, { useRef, useState } from 'react';

interface Tilt3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // Multiplier for tilt magnitude
}

export function Tilt3D({ children, className = '', intensity = 12 }: Tilt3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Mouse position relative to the card's dimensions
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Center point of the card
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Normalized coordinates from -1 to 1
    const normalizedX = (x - centerX) / centerX;
    const normalizedY = (y - centerY) / centerY;
    
    // Calculate rotation: tilting down rotates X, tilting right rotates Y
    const rotateX = -normalizedY * intensity;
    const rotateY = normalizedX * intensity;
    
    card.style.setProperty('--rx', `${rotateX}deg`);
    card.style.setProperty('--ry', `${rotateY}deg`);
    
    // Convert to percentage coordinates (0 - 100%) for visual shine effect
    setCoords({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!cardRef.current) return;
    cardRef.current.style.transition = 'none';
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 preserve-3d transition-transform duration-350 ${className}`}
      style={{
        transform: isHovered 
          ? 'rotateX(var(--rx)) rotateY(var(--ry)) scale3d(1.025, 1.025, 1.025)' 
          : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      }}
    >
      {/* Real-time Dynamic Light Reflection Shine */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none mix-blend-screen opacity-35 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 200px at ${coords.x}% ${coords.y}%, rgba(255, 255, 255, 0.15), rgba(6, 182, 212, 0.1), transparent)`,
            zIndex: 10,
          }}
        />
      )}
      <div className="w-full h-full preserve-3d">
        {children}
      </div>
    </div>
  );
}
