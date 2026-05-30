import React, { useRef, useState } from 'react';

interface Tilt3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // Multiplier for tilt magnitude
}

export function Tilt3D({ children, className = '', intensity = 12 }: Tilt3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
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
    card.style.setProperty('--shine-x', `${(x / rect.width) * 100}%`);
    card.style.setProperty('--shine-y', `${(y / rect.height) * 100}%`);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 preserve-3d tilt-card-3d ${isHovered ? 'tilt-card-hovered' : ''} ${className}`}
    >
      {/* Real-time Dynamic Light Reflection Shine */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none mix-blend-screen opacity-35 transition-opacity duration-300 tilt-card-shine"
        />
      )}
      <div className="w-full h-full preserve-3d">
        {children}
      </div>
    </div>
  );
}
