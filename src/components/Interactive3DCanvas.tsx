import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Interactive3DCanvasProps {
  density?: 'high' | 'medium' | 'low';
  opacity?: number;
  interactive?: boolean;
}

export function Interactive3DCanvas({ 
  density = 'medium', 
  opacity = 0.5, 
  interactive = true 
}: Interactive3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    
    // Set up Dimensions
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    
    // Create Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 28;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // Determine particle count based on density
    const particleCount = density === 'high' ? 110 : density === 'medium' ? 65 : 30;
    
    // Create Particle Geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: number[] = [];
    
    // Range box for particles
    const range = 42;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range * 1.4;     // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * range;       // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * range * 0.4; // z
      
      // Push moving speed velocity coefficients
      velocities.push(
        (Math.random() - 0.5) * 0.04, // vx
        (Math.random() - 0.5) * 0.04, // vy
        (Math.random() - 0.5) * 0.02  // vz
      );
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Material for Particles
    const pMaterial = new THREE.PointsMaterial({
      color: 0x06b6d4, // Metrology Cyan-500
      size: 0.65,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create Points System
    const particleSystem = new THREE.Points(geometry, pMaterial);
    scene.add(particleSystem);
    
    // Connection Lines Material
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6, // Royal Blue-500
      transparent: true,
      opacity: opacity * 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Mouse Interaction Easing variables
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    
    const handleMouseMove = (event: MouseEvent) => {
      mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    
    // Animation Rendering Loop
    let animationFrameId: number;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Ease mouse values to prevent sudden visual jumps
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;
      
      // Tilting the scene based on eased mouse position
      if (interactive) {
        scene.rotation.y = mouse.x * 0.1;
        scene.rotation.x = -mouse.y * 0.1;
      } else {
        scene.rotation.y += 0.0008;
        scene.rotation.x += 0.0003;
      }
      
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const positionsArray = posAttr.array as Float32Array;
      
      // Update particle positions based on velocity vectors
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        positionsArray[i3] += velocities[i3];
        positionsArray[i3 + 1] += velocities[i3 + 1];
        positionsArray[i3 + 2] += velocities[i3 + 2];
        
        // Bounce particles back when they exceed bounding box limits
        const limitX = (range * 1.4) / 2;
        const limitY = range / 2;
        const limitZ = (range * 0.4) / 2;
        
        if (Math.abs(positionsArray[i3]) > limitX) velocities[i3] *= -1;
        if (Math.abs(positionsArray[i3 + 1]) > limitY) velocities[i3 + 1] *= -1;
        if (Math.abs(positionsArray[i3 + 2]) > limitZ) velocities[i3 + 2] *= -1;
      }
      
      posAttr.needsUpdate = true;
      
      // Render connective lines between particles within proximity
      const existingLine = scene.getObjectByName('connections');
      if (existingLine) {
        scene.remove(existingLine);
      }
      
      const linePositions: number[] = [];
      const connectionMaxDistance = 8.5;
      
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = positionsArray[i * 3] - positionsArray[j * 3];
          const dy = positionsArray[i * 3 + 1] - positionsArray[j * 3 + 1];
          const dz = positionsArray[i * 3 + 2] - positionsArray[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (dist < connectionMaxDistance) {
            linePositions.push(
              positionsArray[i * 3], positionsArray[i * 3 + 1], positionsArray[i * 3 + 2],
              positionsArray[j * 3], positionsArray[j * 3 + 1], positionsArray[j * 3 + 2]
            );
          }
        }
      }
      
      if (linePositions.length > 0) {
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const connections = new THREE.LineSegments(lineGeometry, lineMaterial);
        connections.name = 'connections';
        scene.add(connections);
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Resize handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Dispose resources on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      geometry.dispose();
      pMaterial.dispose();
      lineMaterial.dispose();
    };
  }, [density, opacity, interactive]);
  
  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-transparent mix-blend-screen"
    />
  );
}
