import React, { useEffect, useState } from 'react';
import { useRive } from '@rive-app/react-canvas';

const StandingPerson = ({ visible = true }) => {
  const [position, setPosition] = useState({ x: 50, direction: 1 }); // x in pixels, direction: 1 = right, -1 = left
  const [isWalking, setIsWalking] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Rive setup
  const { rive, RiveComponent } = useRive({
    src: '/stickman-walking.riv',
    artboard: 'Stick Man',
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Random walking behavior
  useEffect(() => {
    if (!visible) return;

    const startRandomWalk = () => {
      // Random delay before starting to walk (2-8 seconds)
      const delay = 2000 + Math.random() * 6000;

      const timeout = setTimeout(() => {
        // Start walking
        setIsWalking(true);

        // Random direction
        const newDirection = Math.random() > 0.5 ? 1 : -1;
        setPosition(prev => ({ ...prev, direction: newDirection }));

        // Walk for 3-6 seconds
        const walkDuration = 3000 + Math.random() * 3000;

        setTimeout(() => {
          setIsWalking(false);
          // Schedule next walk
          startRandomWalk();
        }, walkDuration);
      }, delay);

      return timeout;
    };

    const timeout = startRandomWalk();
    return () => clearTimeout(timeout);
  }, [visible]);

  // Update position while walking
  useEffect(() => {
    if (!isWalking || !visible) return;

    const walkSpeed = 1.5; // pixels per frame
    const interval = setInterval(() => {
      setPosition(prev => {
        let newX = prev.x + (walkSpeed * prev.direction);
        let newDirection = prev.direction;

        // Bounce off screen edges
        const minX = 50;
        const maxX = dimensions.width * 0.3; // Only walk in left 30% of screen

        if (newX <= minX) {
          newX = minX;
          newDirection = 1;
        } else if (newX >= maxX) {
          newX = maxX;
          newDirection = -1;
        }

        return { x: newX, direction: newDirection };
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(interval);
  }, [isWalking, visible, dimensions.width]);

  if (!visible) return null;

  const characterHeight = dimensions.height * 0.15; // 15% of screen height
  const characterWidth = characterHeight * 0.5; // Maintain aspect ratio

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        bottom: 20,
        width: characterWidth,
        height: characterHeight,
        pointerEvents: 'none',
        zIndex: 1000,
        transform: `scaleX(${position.direction})`, // Flip based on direction
        transition: 'transform 0.2s ease',
        filter: 'hue-rotate(80deg) saturate(2) brightness(1.2)', // Make it green to match theme
      }}
    >
      <RiveComponent
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default StandingPerson;
