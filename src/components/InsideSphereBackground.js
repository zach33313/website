import React, { useRef, useEffect, useState, useCallback } from 'react';
import './InsideSphereBackground.css';

// Generate sphere points - more lines for better visual effect
function generateInsideSpherePoints(latitudeLines = 20, longitudeLines = 20) {
  const points = [];
  const radius = 1;

  // Latitude circles (horizontal rings)
  for (let lat = 0; lat <= latitudeLines; lat++) {
    const theta = (lat / latitudeLines) * Math.PI;
    const circlePoints = [];
    for (let lon = 0; lon <= longitudeLines * 2; lon++) {
      const phi = (lon / (longitudeLines * 2)) * 2 * Math.PI;
      circlePoints.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(theta) * Math.sin(phi),
      });
    }
    points.push(circlePoints);
  }

  // Longitude lines (vertical lines from pole to pole)
  for (let lon = 0; lon <= longitudeLines; lon++) {
    const phi = (lon / longitudeLines) * 2 * Math.PI;
    const linePoints = [];
    for (let lat = 0; lat <= latitudeLines * 2; lat++) {
      const theta = (lat / (latitudeLines * 2)) * Math.PI;
      linePoints.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(theta) * Math.sin(phi),
      });
    }
    points.push(linePoints);
  }

  return points;
}

// 3D to 2D projection (inside view - we're at the center looking outward)
function projectInside(point, rotationX, rotationY, centerX, centerY, scale) {
  // Apply rotation around Y axis
  let x = point.x * Math.cos(rotationY) - point.z * Math.sin(rotationY);
  let z = point.x * Math.sin(rotationY) + point.z * Math.cos(rotationY);
  let y = point.y;

  // Apply rotation around X axis
  const y2 = y * Math.cos(rotationX) - z * Math.sin(rotationX);
  const z2 = y * Math.sin(rotationX) + z * Math.cos(rotationX);
  y = y2;
  z = z2;

  // Inside sphere projection - fisheye-like effect
  // Points wrap around us, creating curved lines that bend toward edges
  const fov = 1.5;
  const projectionScale = fov / (fov + z * 0.3);

  return {
    x: centerX + x * scale * projectionScale,
    y: centerY - y * scale * projectionScale,
    depth: z,
    scale: projectionScale,
  };
}

const InsideSphereBackground = ({ visible = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const rotationRef = useRef({ x: 0, y: 0 });

  // Pre-generate sphere points
  const spherePoints = React.useMemo(() => generateInsideSpherePoints(20, 20), []);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!visible) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    // Scale to be larger than viewport so lines curve around edges
    const baseScale = Math.max(width, height) * 1.2;

    // Slow auto-rotation for ambient movement
    rotationRef.current.y += 0.0008;
    rotationRef.current.x = Math.sin(Date.now() * 0.00015) * 0.15;

    const rotationX = rotationRef.current.x;
    const rotationY = rotationRef.current.y;

    // Collect lines to draw with depth info
    const linesToDraw = [];

    spherePoints.forEach((line) => {
      if (line.length < 2) return;
      const projectedPoints = line.map((point) =>
        projectInside(point, rotationX, rotationY, centerX, centerY, baseScale)
      );
      const avgDepth = projectedPoints.reduce((sum, p) => sum + p.depth, 0) / projectedPoints.length;
      linesToDraw.push({ points: projectedPoints, depth: avgDepth });
    });

    // Sort by depth - draw back lines first
    linesToDraw.sort((a, b) => a.depth - b.depth);

    // Draw lines with curved appearance
    linesToDraw.forEach(({ points, depth }) => {
      // Opacity based on depth - lines "behind" us (positive z) are visible
      // Lines "in front" (negative z, toward camera) wrap around screen edges
      const normalizedDepth = (depth + 1) / 2; // 0 to 1
      const baseOpacity = 0.12;
      const opacity = baseOpacity + normalizedDepth * 0.15;
      const lineWidth = 0.8 + normalizedDepth * 1.2;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.strokeStyle = `rgba(0, 255, 65, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Add subtle glow to closer lines
      if (normalizedDepth > 0.6) {
        ctx.shadowColor = 'rgba(0, 255, 65, 0.3)';
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, visible, spherePoints]);

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className={`inside-sphere-background ${visible ? 'visible' : ''}`}
    />
  );
};

export default InsideSphereBackground;
