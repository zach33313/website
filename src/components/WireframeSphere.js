import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import './WireframeSphere.css';

// Shape definitions - each shape is an array of 3D points that form the wireframe
const SHAPES = {
  sphere: generateSpherePoints(25, 25),
  fullstack: generateFullstackPoints(),
  neuralNetwork: generateNeuralNetworkPoints(),
  amazon: generateAmazonPoints(),
  cohereHealth: generateCoherePoints(),
  nber: generateNBERPoints(),
  northeastern: generateNortheasternPoints(),
  buttonsDefault: generateButtonsShape(),
  fullstackExpanded: generateExpandedProjectList('fullstack'),
  aimlExpanded: generateExpandedProjectList('aiml'),
  codeIcon: generateCodeIconPoints(),
  frameworkIcon: generateFrameworkIconPoints(),
  infraIcon: generateInfraIconPoints(),
  fallingPerson: generateFallingPersonPoints(),
};

// Generate sphere points using parametric equations
function generateSpherePoints(latitudeLines = 20, longitudeLines = 20) {
  const points = [];
  const radius = 1;

  // Latitude circles
  for (let lat = 0; lat <= latitudeLines; lat++) {
    const theta = (lat / latitudeLines) * Math.PI;
    const circlePoints = [];
    for (let lon = 0; lon <= longitudeLines; lon++) {
      const phi = (lon / longitudeLines) * 2 * Math.PI;
      circlePoints.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(theta) * Math.sin(phi),
      });
    }
    points.push(circlePoints);
  }

  // Longitude lines
  for (let lon = 0; lon <= longitudeLines; lon++) {
    const phi = (lon / longitudeLines) * 2 * Math.PI;
    const linePoints = [];
    for (let lat = 0; lat <= latitudeLines; lat++) {
      const theta = (lat / latitudeLines) * Math.PI;
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

// Generate fullstack icon - browser window with stacked layers using SVG path data
function generateFullstackPoints() {
  const points = [];

  // SVG viewBox: 0 0 393.568 393.568
  const viewBox = "0 0 393.568 393.568";

  // Browser header rectangle
  const browserHeader = "M55.014,67.879 L338.489,67.879 L338.489,107.96 L55.014,107.96 Z";

  // Browser content area
  const browserContent = "M55.014,107.701 L338.489,107.701 L338.489,306.554 L55.014,306.554 Z";

  // Browser buttons (circles as paths)
  const redButton = "M76.541,81.519 A6.271,6.271,0,1,1,76.54,81.519 Z";
  const yellowButton = "M98.004,81.519 A6.271,6.271,0,1,1,98.003,81.519 Z";
  const greenButton = "M119.725,81.519 A6.271,6.271,0,1,1,119.724,81.519 Z";

  // URL bar
  const urlBar = "M277.463,81.519H144.097c-3.426,0-6.271,2.909-6.271,6.271c0,3.362,2.909,6.271,6.271,6.271h133.366c3.426,0,6.271-2.909,6.271-6.271C283.733,84.428,281.147,81.519,277.463,81.519z";

  // Three stacked layers (diamond shapes) - frontend/backend/database
  // Top layer (blue - frontend)
  const frontendLayer = "M196.784,140.218 L87.273,197.301 L196.784,254.448 L306.295,197.301 Z";

  // Middle layer (dark - backend)
  const backendLayer = "M196.784,175.838 L87.273,232.921 L196.784,290.069 L306.295,232.921 Z";

  // Bottom layer (red - database)
  const databaseLayer = "M196.784,211.459 L87.273,268.606 L196.784,325.689 L306.295,268.606 Z";

  // Parse all paths
  const scale = 1.2;
  const sampleMultiplier = 0.5;
  const allPaths = [browserHeader, browserContent, redButton, yellowButton, greenButton, urlBar, frontendLayer, backendLayer, databaseLayer];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Generate neural network / AI brain icon using SVG path data
function generateNeuralNetworkPoints() {
  const points = [];

  // SVG viewBox: 0 0 32 32
  const viewBox = "0 0 32 32";

  // Bottom-right node with connection
  const bottomRightNode = "M27,24a2.9609,2.9609,0,0,0-1.2854.3008L21.4141,20H18v2h2.5859l3.7146,3.7148A2.9665,2.9665,0,0,0,24,27a3,3,0,1,0,3-3Zm0,4a1,1,0,1,1,1-1A1.0009,1.0009,0,0,1,27,28Z";

  // Middle-right node
  const middleRightNode = "M27,13a2.9948,2.9948,0,0,0-2.8157,2H18v2h6.1843A2.9947,2.9947,0,1,0,27,13Zm0,4a1,1,0,1,1,1-1A1.0009,1.0009,0,0,1,27,17Z";

  // Top-right node with connection
  const topRightNode = "M27,2a3.0033,3.0033,0,0,0-3,3,2.9657,2.9657,0,0,0,.3481,1.373L20.5957,10H18v2h3.4043l4.3989-4.2524A2.9987,2.9987,0,1,0,27,2Zm0,4a1,1,0,1,1,1-1A1.0009,1.0009,0,0,1,27,6Z";

  // Main brain/chip shape
  const brainShape = "M18,6h2V4H18a3.9756,3.9756,0,0,0-3,1.3823A3.9756,3.9756,0,0,0,12,4H11a9.01,9.01,0,0,0-9,9v6a9.01,9.01,0,0,0,9,9h1a3.9756,3.9756,0,0,0,3-1.3823A3.9756,3.9756,0,0,0,18,28h2V26H18a2.0023,2.0023,0,0,1-2-2V8A2.0023,2.0023,0,0,1,18,6ZM12,26H11a7.0047,7.0047,0,0,1-6.92-6H6V18H4V14H7a3.0033,3.0033,0,0,0,3-3V9H8v2a1.0009,1.0009,0,0,1-1,1H4.08A7.0047,7.0047,0,0,1,11,6h1a2.0023,2.0023,0,0,1,2,2v4H12v2h2v4H12a3.0033,3.0033,0,0,0-3,3v2h2V21a1.0009,1.0009,0,0,1,1-1h2v4A2.0023,2.0023,0,0,1,12,26Z";

  // Parse all paths
  const scale = 1.2;
  const sampleMultiplier = 0.5;
  const allPaths = [bottomRightNode, middleRightNode, topRightNode, brainShape];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Helper: Parse SVG path and convert to points
// sampleMultiplier: 1.0 = full detail, 0.5 = half the samples (faster), etc.
function parseSVGPath(pathData, viewBox, offsetX = 0, offsetY = 0, scale = 1, translateX = 0, translateY = 0, sampleMultiplier = 1.0) {
  const points = [];
  // Parse viewBox to get dimensions for normalization
  const [, , width, height] = viewBox.split(' ').map(Number);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDim = Math.max(width, height);

  // Normalize a point from SVG coords to our -1 to 1 range
  const normalize = (x, y) => ({
    x: ((x + translateX - centerX) / maxDim * 2 + offsetX) * scale,
    y: (-(y + translateY - centerY) / maxDim * 2 + offsetY) * scale, // flip Y
    z: 0
  });

  // Sample a quadratic bezier curve
  const sampleQuadratic = (x0, y0, cx, cy, x1, y1, samples = Math.max(3, Math.round(8 * sampleMultiplier))) => {
    const pts = [];
    for (let t = 0; t <= 1; t += 1 / samples) {
      const mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      pts.push(normalize(x, y));
    }
    return pts;
  };

  // Sample a cubic bezier curve
  const sampleCubic = (x0, y0, cx1, cy1, cx2, cy2, x1, y1, samples = Math.max(3, Math.round(10 * sampleMultiplier))) => {
    const pts = [];
    for (let t = 0; t <= 1; t += 1 / samples) {
      const mt = 1 - t;
      const x = mt*mt*mt*x0 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x1;
      const y = mt*mt*mt*y0 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y1;
      pts.push(normalize(x, y));
    }
    return pts;
  };

  // Sample an elliptical arc (proper implementation)
  const sampleArc = (x0, y0, rx, ry, rotation, largeArcFlag, sweepFlag, x1, y1, samples = Math.max(4, Math.round(12 * sampleMultiplier))) => {
    const pts = [];

    // Handle degenerate cases
    if (rx === 0 || ry === 0 || (x0 === x1 && y0 === y1)) {
      pts.push(normalize(x1, y1));
      return pts;
    }

    // Convert rotation to radians
    const phi = (rotation * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Step 1: Compute (x1', y1') - transformed midpoint
    const dx = (x0 - x1) / 2;
    const dy = (y0 - y1) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;

    // Ensure radii are large enough
    let rxSq = rx * rx;
    let rySq = ry * ry;
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;

    // Check if radii are large enough, scale if needed
    const lambda = x1pSq / rxSq + y1pSq / rySq;
    if (lambda > 1) {
      const lambdaSqrt = Math.sqrt(lambda);
      rx *= lambdaSqrt;
      ry *= lambdaSqrt;
      rxSq = rx * rx;
      rySq = ry * ry;
    }

    // Step 2: Compute (cx', cy') - transformed center
    let sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
    sq = Math.sqrt(sq);
    if (largeArcFlag === sweepFlag) sq = -sq;
    const cxp = sq * (rx * y1p) / ry;
    const cyp = sq * -(ry * x1p) / rx;

    // Step 3: Compute (cx, cy) - center in original coordinates
    const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;

    // Step 4: Compute start and sweep angles
    const vectorAngle = (ux, uy, vx, vy) => {
      const sign = (ux * vy - uy * vx) < 0 ? -1 : 1;
      const dot = ux * vx + uy * vy;
      const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
      return sign * Math.acos(Math.max(-1, Math.min(1, dot / len)));
    };

    const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dtheta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);

    if (!sweepFlag && dtheta > 0) dtheta -= 2 * Math.PI;
    if (sweepFlag && dtheta < 0) dtheta += 2 * Math.PI;

    // Sample the arc
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const theta = theta1 + t * dtheta;
      const xp = rx * Math.cos(theta);
      const yp = ry * Math.sin(theta);
      const x = cosPhi * xp - sinPhi * yp + cx;
      const y = sinPhi * xp + cosPhi * yp + cy;
      pts.push(normalize(x, y));
    }
    return pts;
  };

  // Tokenize path data - split into commands and their arguments
  const tokenize = (d) => {
    const tokens = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
    let match;
    while ((match = regex.exec(d)) !== null) {
      tokens.push(match[0]);
    }
    return tokens;
  };

  const tokens = tokenize(pathData);
  let currentX = 0, currentY = 0;
  let startX = 0, startY = 0;
  let currentPath = [];
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i];
    const isRelative = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();
    i++;

    const getNum = () => parseFloat(tokens[i++]);
    const getCoord = (base, relative) => relative ? base + getNum() : getNum();

    if (type === 'M') {
      if (currentPath.length > 1) points.push(currentPath);
      currentPath = [];
      currentX = getCoord(currentX, isRelative);
      currentY = getCoord(currentY, isRelative);
      startX = currentX;
      startY = currentY;
      currentPath.push(normalize(currentX, currentY));
      // Subsequent coordinates are treated as lineto
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        currentX = getCoord(currentX, isRelative);
        currentY = getCoord(currentY, isRelative);
        currentPath.push(normalize(currentX, currentY));
      }
    } else if (type === 'L') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        currentX = getCoord(currentX, isRelative);
        currentY = getCoord(currentY, isRelative);
        currentPath.push(normalize(currentX, currentY));
      }
    } else if (type === 'H') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        currentX = getCoord(currentX, isRelative);
        currentPath.push(normalize(currentX, currentY));
      }
    } else if (type === 'V') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        currentY = getCoord(currentY, isRelative);
        currentPath.push(normalize(currentX, currentY));
      }
    } else if (type === 'C') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const cx1 = getCoord(isRelative ? currentX : 0, isRelative);
        const cy1 = getCoord(isRelative ? currentY : 0, isRelative);
        const cx2 = getCoord(isRelative ? currentX : 0, isRelative);
        const cy2 = getCoord(isRelative ? currentY : 0, isRelative);
        const x = getCoord(isRelative ? currentX : 0, isRelative);
        const y = getCoord(isRelative ? currentY : 0, isRelative);
        const pts = sampleCubic(currentX, currentY, cx1, cy1, cx2, cy2, x, y);
        currentPath.push(...pts.slice(1));
        currentX = x;
        currentY = y;
      }
    } else if (type === 'S') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const cx2 = getCoord(isRelative ? currentX : 0, isRelative);
        const cy2 = getCoord(isRelative ? currentY : 0, isRelative);
        const x = getCoord(isRelative ? currentX : 0, isRelative);
        const y = getCoord(isRelative ? currentY : 0, isRelative);
        // Smooth cubic - reflect previous control point (simplified: use current point)
        const pts = sampleCubic(currentX, currentY, currentX, currentY, cx2, cy2, x, y);
        currentPath.push(...pts.slice(1));
        currentX = x;
        currentY = y;
      }
    } else if (type === 'Q') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const cx = getCoord(isRelative ? currentX : 0, isRelative);
        const cy = getCoord(isRelative ? currentY : 0, isRelative);
        const x = getCoord(isRelative ? currentX : 0, isRelative);
        const y = getCoord(isRelative ? currentY : 0, isRelative);
        const pts = sampleQuadratic(currentX, currentY, cx, cy, x, y);
        currentPath.push(...pts.slice(1));
        currentX = x;
        currentY = y;
      }
    } else if (type === 'A') {
      while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
        const rx = getNum();
        const ry = getNum();
        const rotation = getNum();
        const largeArc = getNum();
        const sweep = getNum();
        const x = getCoord(isRelative ? currentX : 0, isRelative);
        const y = getCoord(isRelative ? currentY : 0, isRelative);
        const pts = sampleArc(currentX, currentY, rx, ry, rotation, largeArc, sweep, x, y);
        currentPath.push(...pts.slice(1));
        currentX = x;
        currentY = y;
      }
    } else if (type === 'Z') {
      if (currentPath.length > 1) {
        currentPath.push(currentPath[0]); // close the path
        points.push(currentPath);
      }
      currentPath = [];
      currentX = startX;
      currentY = startY;
    }
  }
  if (currentPath.length > 1) points.push(currentPath);

  return points;
}

// Generate Amazon logo - lowercase 'a' above the smile/arrow
function generateAmazonPoints() {
  const points = [];

  // SVG path data for lowercase 'a' from provided SVG
  const aPathData = "M 28.905 23.9 L 28.905 15.2 Q 28.905 10.2 27.405 7.75 Q 25.905 5.3 21.705 5.3 Q 18.205 5.3 15.905 7.15 Q 13.605 9 13.605 12.3 Q 13.605 14.4 14.405 16.8 Q 13.005 17.9 10.405 17.9 Q 6.805 17.9 4.705 16.1 Q 2.605 14.3 2.605 10.9 Q 2.605 6.1 8.005 3.05 Q 13.405 0 22.405 0 Q 29.005 0 32.805 1.95 Q 36.605 3.9 38.255 7.95 Q 39.905 12 39.905 18.8 L 39.905 44.8 Q 39.905 49.7 43.005 51.4 Q 42.205 52.9 40.655 53.7 Q 39.105 54.5 37.105 54.5 Q 34.205 54.5 32.305 52.85 Q 30.405 51.2 30.005 48.4 Q 28.105 51.9 24.455 53.55 Q 20.805 55.2 16.205 55.2 Q 9.305 55.2 4.655 51 Q 0.005 46.8 0.005 40.1 Q 0.005 23.9 28.905 23.9 Z";
  const aInnerPath = "M 28.905 36.8 L 28.905 28.9 Q 12.005 28.9 12.005 39.7 Q 12.005 43.7 14.155 46.1 Q 16.305 48.5 20.105 48.5 Q 24.505 48.5 26.705 45.15 Q 28.905 41.8 28.905 36.8 Z";
  const viewBox = "0 0 43.005 55.201";

  // Parse the outer contour and inner bowl of 'a' - scale down to match smile size
  // Position 'a' above the minimum point of the smile curve
  const outerPoints = parseSVGPath(aPathData, viewBox, 0, 0.5, 0.5);
  const innerPoints = parseSVGPath(aInnerPath, viewBox, 0, 0.5, 0.5);

  // Add main paths at z=0
  points.push(...outerPoints);
  points.push(...innerPoints);

  // Add 3D depth
  for (const z of [-0.1, 0.1]) {
    for (const path of [...outerPoints, ...innerPoints]) {
      const depthPath = path.map(p => ({ ...p, z }));
      points.push(depthPath);
    }
  }

  // Add connecting lines between front and back at key vertices
  const connectFrontBack = (pathSet) => {
    for (const path of pathSet) {
      // Connect every few points to create 3D wireframe effect
      for (let i = 0; i < path.length; i += Math.max(1, Math.floor(path.length / 12))) {
        points.push([
          { ...path[i], z: -0.1 },
          { ...path[i], z: 0.1 }
        ]);
      }
    }
  };
  connectFrontBack(outerPoints);
  connectFrontBack(innerPoints);

  // The Amazon smile - using SVG path data
  // SVG viewBox: 0 0 49.24 10.35, transform: translate(-0.76, -21.33)
  const smileViewBox = "0 0 49.24 10.35";
  const smileTranslateX = -0.76;
  const smileTranslateY = -21.33;

  // Arrow path
  const arrowPath = "M46.45,21.33a8.87,8.87,0,0,0-5,1.45c-.41.31-.41.73.1.73,1.65-.21,5.35-.73,6.07.2s-.72,4.36-1.34,6c-.20.52.21.62.62.31,2.78-2.39,3.5-7.26,3-7.88C49.54,21.64,48.09,21.33,46.45,21.33Z";

  // Smile curve path
  const smilePath = "M1.06,22.46a.36.36,0,0,0-.22.13.38.38,0,0,0,.06.52,39,39,0,0,0,10.16,5.82,39.36,39.36,0,0,0,11.53,2.66,37.64,37.64,0,0,0,11.83-1.08,32.72,32.72,0,0,0,10.79-4.85.74.74,0,0,0-.74-1.28l0,0a49.44,49.44,0,0,1-10.63,3.37,46,46,0,0,1-11,.92,47.45,47.45,0,0,1-11-1.91A57.57,57.57,0,0,1,1.33,22.51l0,0A.37.37,0,0,0,1.06,22.46Z";

  // Parse smile and arrow paths - position below the 'a'
  const smileScale = 0.85;
  const smileOffsetY = -0.5;
  const smileOffsetX = 0.07;

  const smilePoints = parseSVGPath(smilePath, smileViewBox, smileOffsetX, smileOffsetY, smileScale, smileTranslateX, smileTranslateY);
  const arrowPoints = parseSVGPath(arrowPath, smileViewBox, smileOffsetX, smileOffsetY, smileScale, smileTranslateX, smileTranslateY);

  // Add smile and arrow at z=0
  points.push(...smilePoints);
  points.push(...arrowPoints);

  // Add 3D depth to smile
  for (const z of [-0.08, 0.08]) {
    for (const path of [...smilePoints, ...arrowPoints]) {
      const depthPath = path.map(p => ({ ...p, z }));
      points.push(depthPath);
    }
  }

  // Connect front and back at key points
  const connectSmileFrontBack = (pathSet) => {
    for (const path of pathSet) {
      for (let i = 0; i < path.length; i += Math.max(1, Math.floor(path.length / 8))) {
        points.push([
          { ...path[i], z: -0.08 },
          { ...path[i], z: 0.08 }
        ]);
      }
    }
  };
  connectSmileFrontBack(smilePoints);
  connectSmileFrontBack(arrowPoints);

  return points;
}

// Generate Cohere Health logo - clean block letters
function generateCoherePoints() {
  const points = [];

  // Cohere Health logo - using SVG path data
  // viewBox: 0 0 126 44
  const viewBox = "0 0 126 44";

  // "cohere" letters (top part of logo)
  // c - cyan
  const cPath = "M-0.00183292 20.1923C-0.0280829 21.43 0.195042 22.6611 0.660981 23.8136C1.12036 24.9661 1.81598 26.0073 2.68879 26.8848C3.56817 27.7623 4.61161 28.4499 5.76004 28.9148C6.90848 29.3797 8.14223 29.6024 9.38254 29.5762C10.7279 29.6024 12.06 29.3208 13.2807 28.7576C14.5013 28.1945 15.5775 27.3628 16.4307 26.3282C16.6275 26.0925 16.7588 25.8043 16.7916 25.4965C16.7916 24.8941 16.0697 24.2458 15.4922 24.2458C15.3085 24.2589 15.1379 24.3113 14.9738 24.3964C14.8163 24.4815 14.6719 24.5994 14.5604 24.7435C13.9238 25.5031 13.1297 26.1055 12.2307 26.5181C11.3316 26.9306 10.3538 27.1336 9.36286 27.114C8.45067 27.1271 7.54504 26.9568 6.70504 26.6163C5.85848 26.2758 5.09067 25.765 4.44754 25.1233C3.80442 24.4815 3.29254 23.7088 2.95129 22.8706C2.61004 22.0259 2.43942 21.1222 2.45254 20.212C2.43286 19.3083 2.60348 18.4046 2.95129 17.5664C3.29911 16.7282 3.81098 15.9686 4.46067 15.34C5.09723 14.6851 5.86504 14.1678 6.70504 13.8142C7.55161 13.4606 8.45723 13.2903 9.36942 13.2969C10.321 13.2772 11.266 13.4671 12.1388 13.8535C13.0116 14.2398 13.7925 14.803 14.4225 15.5233C14.521 15.6608 14.6588 15.7787 14.8097 15.8573C14.9607 15.9359 15.1313 15.9817 15.3019 15.9883C15.63 15.9359 15.9254 15.7787 16.1616 15.5495C16.3979 15.3138 16.5488 15.0191 16.6013 14.6917C16.5816 14.3774 16.4504 14.0827 16.2404 13.86C15.3807 12.8974 14.3241 12.1247 13.1429 11.6008C11.9616 11.0835 10.6754 10.8216 9.38254 10.8412C8.14879 10.8216 6.92161 11.0573 5.78629 11.5288C4.64442 11.9741 3.61411 12.6748 2.75442 13.5588C1.86848 14.4166 1.17286 15.4513 0.700356 16.5907C0.227855 17.7301 -0.00183292 18.9547 0.0178546 20.1923";

  // o - cyan
  const oPath = "M23.1576 20.1924C23.1379 19.2887 23.3086 18.3916 23.6498 17.5534C23.9911 16.7152 24.5029 15.9556 25.1526 15.3269C25.7892 14.6721 26.557 14.1547 27.4036 13.8011C28.2501 13.4475 29.1558 13.2773 30.0679 13.2838C31.8989 13.2969 33.6445 14.0303 34.9373 15.3204C36.2301 16.6104 36.9651 18.3654 36.9783 20.1924C36.9914 21.1091 36.8142 22.0128 36.4598 22.8576C36.112 23.7023 35.5936 24.4685 34.9373 25.1037C34.3073 25.752 33.5461 26.2627 32.7061 26.6098C31.8661 26.9503 30.967 27.1206 30.0614 27.1009C29.1492 27.114 28.2436 26.9438 27.4036 26.6033C26.557 26.2627 25.7892 25.752 25.1461 25.1102C24.5029 24.4685 23.9911 23.6958 23.6498 22.851C23.3151 22.0063 23.1445 21.1026 23.1576 20.1924ZM20.7033 20.1924C20.6967 21.4235 20.9395 22.648 21.4054 23.7874C21.8779 24.9269 22.567 25.9681 23.4398 26.839C24.3126 27.7099 25.3495 28.4041 26.4914 28.869C27.6333 29.3405 28.8539 29.5762 30.0876 29.5697C31.3214 29.6024 32.542 29.3798 33.6839 28.9148C34.8258 28.4499 35.8561 27.7558 36.7223 26.8783C37.6083 26.0074 38.3104 24.9727 38.7829 23.8202C39.2554 22.6742 39.4851 21.4366 39.4589 20.1989C39.4654 18.9678 39.2226 17.7433 38.7567 16.6038C38.2908 15.4644 37.5951 14.4298 36.7223 13.5523C35.8495 12.6814 34.8126 11.9872 33.6708 11.5223C32.5289 11.0508 31.3083 10.8151 30.0745 10.8151C28.8408 10.8151 27.6267 11.0508 26.4848 11.5223C25.3495 11.9938 24.3126 12.6814 23.4464 13.5523C22.5736 14.4232 21.8845 15.4579 21.4186 16.5973C20.9395 17.7433 20.7033 18.9613 20.7033 20.1924Z";

  // h - pink
  const hPath = "M62.6167 19.3083C62.4527 16.964 61.3698 14.7834 59.6045 13.2314C57.8786 11.6336 55.6014 10.7627 53.252 10.815C51.9658 10.7888 50.6927 11.0442 49.518 11.555C48.3433 12.0658 47.2867 12.8254 46.4336 13.7815V1.17579C46.4336 0.337598 46.0136 -0.0749512 45.1802 -0.0749512C44.3467 -0.0749512 43.9727 0.337598 43.9727 1.17579V28.2469C43.9727 29.0785 44.3861 29.4976 45.1802 29.4976C45.9677 29.4976 46.4336 29.0785 46.4336 28.2469V19.3083C46.5977 18.0379 47.1161 16.833 47.9298 15.8377C48.737 14.8423 49.8133 14.0892 51.0208 13.6636C52.2348 13.2379 53.5408 13.1594 54.7942 13.4344C56.0477 13.7094 57.2027 14.325 58.1214 15.2221C58.7842 15.8311 59.3027 16.5645 59.657 17.3896C60.0114 18.2147 60.182 19.1053 60.1623 19.9959V28.2469C60.1623 29.0392 60.5823 29.4518 61.4158 29.4518C61.5798 29.4714 61.7439 29.4518 61.9014 29.3994C62.0589 29.347 62.1967 29.2553 62.3148 29.144C62.433 29.0261 62.5183 28.8886 62.5708 28.7315C62.6233 28.5743 62.643 28.4106 62.6233 28.2469V19.3083H62.6167Z";

  // e (first) - pink
  const e1Path = "M72.6755 14.1613C74.303 13.3427 76.1799 13.1921 77.919 13.7422C80.6096 14.5738 82.1846 16.3812 82.6439 19.125H69.0661C69.2236 18.0707 69.6305 17.0622 70.2605 16.1978C70.8905 15.34 71.7174 14.6393 72.6755 14.1613ZM67.7996 15.4775C66.9136 16.9509 66.4477 18.6338 66.4543 20.3495C66.4346 21.5806 66.6708 22.8052 67.1368 23.9446C67.6093 25.084 68.3049 26.1186 69.1908 26.9765C70.0571 27.854 71.0874 28.5481 72.2293 29.013C73.3711 29.4845 74.5918 29.7203 75.819 29.7072C77.5777 29.7203 79.3036 29.216 80.7802 28.2665C80.9639 28.1748 81.1149 28.0308 81.233 27.8605C81.3446 27.6903 81.4168 27.4938 81.4299 27.2908C81.4299 26.6884 80.8261 25.9025 80.2683 25.9025C79.9861 25.9156 79.7105 26.0139 79.4808 26.1776C78.3849 26.8717 77.1118 27.245 75.8124 27.2581C72.984 27.2581 70.9365 26.0073 69.6765 23.4993C69.3811 22.8968 69.158 22.2616 69.0268 21.6002H83.963C84.7505 21.6002 85.1705 21.1811 85.1705 20.3495C85.1902 18.3588 84.5733 16.4139 83.4052 14.7965C82.2371 13.1856 80.5768 11.9937 78.6736 11.3978C77.7352 11.1097 76.764 10.9722 75.7861 10.9787C72.2621 10.9787 69.5714 12.4652 67.7602 15.4775";

  // r - pink
  const rPath = "M103.847 11.6008L97.7114 8.64092L97.5408 8.55579L97.7376 10.8281C95.4998 11.1293 93.4523 12.2425 91.9823 13.9517C90.5123 15.6608 89.7117 17.848 89.738 20.1006V28.3582C89.7183 28.5219 89.738 28.6856 89.7905 28.8427C89.843 28.9999 89.9348 29.1374 90.0464 29.2553C90.1645 29.3732 90.3023 29.4583 90.4598 29.5107C90.6173 29.5631 90.7814 29.5827 90.9389 29.5631C91.7723 29.5631 92.1923 29.144 92.1923 28.3582V20.1006C92.1726 19.1969 92.3433 18.2933 92.6845 17.4551C93.0258 16.6169 93.5376 15.8573 94.1873 15.2221C95.198 14.1874 96.517 13.5064 97.9476 13.2772L98.1708 15.8376L103.847 11.6008Z";

  // e (second) - pink
  const e2Path = "M109.733 14.1612C111.36 13.3427 113.237 13.1921 114.976 13.7421C117.667 14.5738 119.242 16.3811 119.708 19.1249H106.117C106.274 18.0706 106.681 17.0622 107.311 16.1978C107.941 15.3334 108.768 14.6327 109.726 14.1612H109.733ZM104.87 15.4774C103.984 16.9508 103.518 18.6338 103.525 20.3495C103.505 21.5806 103.741 22.7986 104.207 23.938C104.673 25.0774 105.369 26.1055 106.248 26.9633C107.114 27.8408 108.151 28.535 109.293 29.0064C110.435 29.4779 111.656 29.7137 112.889 29.7006C114.648 29.7071 116.374 29.2094 117.851 28.2599C118.034 28.1683 118.185 28.0242 118.303 27.8539C118.415 27.6837 118.487 27.4872 118.5 27.2842C118.5 26.6818 117.896 25.896 117.339 25.896C117.056 25.9091 116.781 26.0073 116.551 26.171C115.455 26.8651 114.189 27.2384 112.889 27.2515C110.061 27.2515 108.013 26.0007 106.753 23.4927C106.451 22.8902 106.235 22.255 106.104 21.5937H121.046C121.834 21.5937 122.254 21.1746 122.254 20.3429C122.274 18.3522 121.657 16.4073 120.489 14.7899C119.321 13.179 117.66 11.9871 115.757 11.3912C114.819 11.1031 113.847 10.9656 112.87 10.9721C109.346 10.9721 106.655 12.4586 104.844 15.4709";

  // Parse only "cohere" letters (skip HEALTH text for performance)
  // Use very low sampling (0.25) for fast transitions
  const scale = 1.0;
  const sampleMultiplier = 0.25;
  const allPaths = [cPath, oPath, hPath, e1Path, rPath, e2Path];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Generate NBER (National Bureau of Economic Research) - using SVG path data
function generateNBERPoints() {
  const points = [];

  // NBER SVG paths - viewBox approximately 0 0 122 30
  const viewBox = "0 0 122 30";

  // NB combined path
  const nbPath = "M49.51,15.57V15.5C56.93,15.57,60,12.67,60,9.88c0-3.11-2.63-5.53-9.74-5.53h-28c-.83,0-1.59.76,0,1.07,2.34.63,4.48,4.49,4.48,12.94v3.28h-.07L20.2,8.91c-2-4-.45-3.07-.45-4.07,0-.49-.59-.49-.79-.49H5.25c-.41,0-1.44,0-1.44.52s.65.49,1.07.49A3.49,3.49,0,0,1,7.33,7V18.57c0,3.52-.66,8.84-4.11,9.49-.24.07-.52.1-.52.48s.38.49.73.49h10.8c1,0,1.07-.87-.14-1-3-.42-5.76-3.66-5.76-13.53v-6l.1-.07L18.89,27.92c.51.93.89,2.42,1.2,2.42a2.77,2.77,0,0,0,1.25-.69A16,16,0,0,1,29.14,26c.34,0,1.41-.07,1.41-.56,0-.93-1.9-.07-2.8-1.79v-5.9c0-9.91,2.73-12,4.35-12.36l.15,0c1.58.22,1.66,1.53,1.66,8.94v4.72c0,8.49-.1,9-2.45,9-.34,0-1,0-1,.55s.59.45.9.45H50.72c6.83,0,9.93-3.18,9.93-7.22C60.65,18.33,58.31,15.09,49.51,15.57Zm-5.42-5.52c0-4.49.31-4.69,2.62-4.69s2.73.58,2.73,3.52v3.38c0,1.93-.59,2.86-3.66,2.86H44.09Zm5.35,9v5.18c0,3.38-.65,3.8-2.69,3.8-2.55,0-2.66-.18-2.66-4.8V16.12h1.62C49.06,16.12,49.47,16.81,49.44,19.05Z";

  // E path
  const ePath = "M87.38,19.64l-.76,1.11C84.86,23.47,81.27,28,77.72,28c-1.76,0-2.49-.49-2.49-4V16h1c2.42,0,4.35,1.14,4.42,4.66,0,1.76,1,1.52,1,.41V10.36c0-.9-.83-1.24-1,.24-.41,3.49-2,4.42-4.42,4.42h-1V9.32c.14-3.41.62-4,2.52-4,3.69,0,7.08,4.52,8.39,7.59.1.27.45,1.24.86,1.24s.45-.42.28-1.59L85.45,3.08c-.14-1.14-.56-1.14-1.07-.52-.83.93-1.93,1.66-6.25,1.79H62.5c-.31,0-.9,0-.9.45s.66.56,1,.56c2.35,0,2.45.48,2.45,9v4.72c0,8.49-.1,9-2.45,9-.34,0-1,0-1,.55s.59.45.9.45H78.13c5.94,0,6.35,1,7.08,1.93.31.41.79.48,1-.59l2.24-11.11C88.45,18.88,87.9,18.43,87.38,19.64Z";

  // R path
  const rPath = "M120.69,28c-2.24,0-5.69-6.66-5.79-9.63,0-.86-.11-.79-1.35-.59a11,11,0,0,1-8.66-1.14v-.06c4.73-.32,12.59.31,12.59-6.42,0-6.15-6.72-5.84-11.11-5.84H88.81c-.28,0-.86,0-.86.52s.48.49.82.49c2.18,0,2.35.62,2.35,9v4.72c0,8.36-.17,9-2.35,9-.34,0-.82.07-.82.48s.58.52.86.52h14.8c.28,0,.87,0,.87-.52S104,28,103.65,28c-2.18,0-2.35-.62-2.35-9V16.92h2.38L107.86,28c.2.72.31,1,1.1,1h11.66c.32,0,.76,0,.76-.45S121,28,120.69,28ZM101.3,15.91v-5c0-5.46.59-5.52,2.8-5.52S107,5.53,107,9.91c0,5.35-.76,6-3,6Z";

  // Parse all paths (scale reduced from 1.4 to 1.0 for better fit)
  const nbPoints = parseSVGPath(nbPath, viewBox, 0, 0, 1.0);
  const ePoints = parseSVGPath(ePath, viewBox, 0, 0, 1.0);
  const rPoints = parseSVGPath(rPath, viewBox, 0, 0, 1.0);

  // Add front layer (z = 0)
  points.push(...nbPoints);
  points.push(...ePoints);
  points.push(...rPoints);

  // Add back layer for 3D depth
  const depth = 0.15;
  const addBackLayer = (pathPoints) => {
    pathPoints.forEach(path => {
      const backPath = path.map(p => ({ ...p, z: depth }));
      points.push(backPath);
    });
  };

  addBackLayer(nbPoints);
  addBackLayer(ePoints);
  addBackLayer(rPoints);

  // Add connecting lines between front and back at key points
  const connectFrontBack = (pathPoints) => {
    pathPoints.forEach(path => {
      if (path.length > 0) {
        // Connect first point
        points.push([
          { ...path[0], z: 0 },
          { ...path[0], z: depth }
        ]);
        // Connect last point
        points.push([
          { ...path[path.length - 1], z: 0 },
          { ...path[path.length - 1], z: depth }
        ]);
      }
    });
  };

  connectFrontBack(nbPoints);
  connectFrontBack(ePoints);
  connectFrontBack(rPoints);

  return points;
}

// Generate Northeastern University N logo - the distinctive red N mark
function generateNortheasternPoints() {
  const points = [];

  // Northeastern N logo - using SVG path data
  // viewBox: 0 0 216 166.58
  const nPathData = "M188.86 46.99c0-26.92 9.05-35.74 27.14-42.58V0h-59.35v4.41c18.09 6.84 27.14 15.66 27.14 42.58v78.99L58.25 5.96C52.51.66 50.97 0 47.22 0H0v4.41c10.37 1.1 16.55 3.97 31.55 18.53l5.74 5.52v90.02c0 26.92-9.05 35.74-27.14 42.58v4.41H69.5v-4.41c-18.09-6.84-27.14-15.66-27.14-42.58V32.65l142.09 133.92h4.41V46.99z";
  const viewBox = "0 0 216 166.58";

  // Parse the N path (reduced scale from 1.1 to 0.85 for better fit)
  const nPoints = parseSVGPath(nPathData, viewBox, 0, 0, 0.85);

  // Add main path at z=0
  points.push(...nPoints);

  // Add 3D depth
  const depth = 0.15;
  for (const z of [-depth, depth]) {
    for (const path of nPoints) {
      const depthPath = path.map(p => ({ ...p, z }));
      points.push(depthPath);
    }
  }

  // Connect front and back at key vertices
  for (const path of nPoints) {
    for (let i = 0; i < path.length; i += Math.max(1, Math.floor(path.length / 16))) {
      points.push([
        { ...path[i], z: -depth },
        { ...path[i], z: depth }
      ]);
    }
  }

  return points;
}

// Generate code icon - browser window with </> - using SVG path data
function generateCodeIconPoints() {
  const points = [];

  // SVG viewBox: 0 0 70 70
  const viewBox = "0 0 70 70";

  // Browser window frame
  const framePath = "M62.817,2.583H6.026c-2.209,0-3.443,2.06-3.443,4.269v57c0,2.209,1.234,2.731,3.443,2.731h57c2.209,0,3.557-0.522,3.557-2.731v-58C66.583,3.643,65.026,2.583,62.817,2.583z M62.583,6.583v9h-56v-9H62.583z M6.583,62.583v-45h56v45H6.583z";

  // Browser dots
  const dot1Path = "M10.417,12.583h2c0.553,0,1-0.447,1-1s-0.447-1-1-1h-2c-0.553,0-1,0.447-1,1S9.864,12.583,10.417,12.583z";
  const dot2Path = "M16.417,12.583h2c0.553,0,1-0.447,1-1s-0.447-1-1-1h-2c-0.553,0-1,0.447-1,1S15.864,12.583,16.417,12.583z";
  const dot3Path = "M22.417,12.583h2c0.553,0,1-0.447,1-1s-0.447-1-1-1h-2c-0.553,0-1,0.447-1,1S21.864,12.583,22.417,12.583z";

  // Left angle bracket <
  const leftBracketPath = "M26.109,33.077c-0.429-0.35-1.058-0.285-1.406,0.143l-5.944,7.283c-0.293,0.357-0.302,0.87-0.021,1.238l5.944,7.801c0.196,0.258,0.494,0.394,0.796,0.394c0.211,0,0.424-0.066,0.605-0.205c0.438-0.334,0.523-0.962,0.188-1.401l-5.466-7.173l5.445-6.673C26.602,34.056,26.538,33.426,26.109,33.077z";

  // Right angle bracket >
  const rightBracketPath = "M44.328,33.245c-0.333-0.438-0.96-0.525-1.401-0.188c-0.439,0.334-0.523,0.962-0.188,1.401l5.466,7.172l-5.445,6.674c-0.35,0.428-0.286,1.058,0.143,1.406c0.186,0.152,0.409,0.226,0.631,0.226c0.29,0,0.578-0.126,0.775-0.368l5.944-7.284c0.293-0.358,0.302-0.87,0.021-1.238L44.328,33.245z";

  // Forward slash /
  const slashPath = "M31.241,31.734c-0.205-0.514-0.786-0.762-1.299-0.561c-0.514,0.204-0.764,0.786-0.561,1.299l7.916,19.918c0.156,0.393,0.532,0.631,0.93,0.631c0.123,0,0.248-0.022,0.369-0.07c0.514-0.204,0.764-0.786,0.561-1.299L31.241,31.734z";

  // Parse all paths with moderate sampling for good visuals
  const scale = 1.2;
  const sampleMultiplier = 0.5;
  const allPaths = [framePath, dot1Path, dot2Path, dot3Path, leftBracketPath, rightBracketPath, slashPath];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Generate framework icon - code/document with arrows using SVG path data
function generateFrameworkIconPoints() {
  const points = [];

  // SVG viewBox: 0 0 32 32
  const viewBox = "0 0 32 32";

  // Convert polygon points to path format (M x,y L x,y ... Z)
  // Bottom-left resize/expand icon
  const expandPath = "M4,20 L4,22 L8.586,22 L2,28.586 L3.414,30 L10,23.414 L10,28 L12,28 L12,20 Z";

  // Right arrow
  const rightArrowPath = "M27.17,26 L24.59,28.58 L26,30 L30,26 L26,22 L24.58,23.41 Z";

  // Left arrow
  const leftArrowPath = "M18.83,26 L21.41,23.42 L20,22 L16,26 L20,30 L21.42,28.59 Z";

  // Document/file icon
  const documentPath = "M25.7,9.3l-7-7A.9087.9087,0,0,0,18,2H8A2.0058,2.0058,0,0,0,6,4V16H8V4h8v6a2.0058,2.0058,0,0,0,2,2h6v6h2V10A.9092.9092,0,0,0,25.7,9.3ZM18,10V4.4L23.6,10Z";

  // Parse all paths
  const scale = 1.2;
  const sampleMultiplier = 0.5;
  const allPaths = [expandPath, rightArrowPath, leftArrowPath, documentPath];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Generate infrastructure icon - cloud network diagram using SVG path data
function generateInfraIconPoints() {
  const points = [];

  // SVG viewBox: 0 0 512 512 (with translate 0 -1)
  const viewBox = "0 0 512 512";

  // Top-left node with connections
  const topLeftNode = "M42.668,231.399c-4.71,0-8.533,3.814-8.533,8.533v25.6c0,4.719,3.823,8.533,8.533,8.533c4.71,0,8.533-3.814,8.533-8.533v-25.6C51.201,235.213,47.378,231.399,42.668,231.399z";

  // Bottom-left node with connections
  const bottomLeftNode = "M111.317,408.873l-27.571-12.979c0.93-3.499,1.587-7.108,1.587-10.897c0-8.226-2.449-15.855-6.502-22.383l15.471-10.317c3.917-2.62,4.975-7.91,2.364-11.836c-2.611-3.917-7.91-4.975-11.836-2.364L66.97,350.01c-4.676-3.26-9.993-5.641-15.77-6.818v-43.529c0-4.719-3.823-8.533-8.533-8.533c-4.71,0-8.533,3.814-8.533,8.533v43.529C14.686,347.16,0,364.398,0,384.997c0,23.526,19.14,42.667,42.667,42.667c13.619,0,25.626-6.528,33.442-16.486l27.938,13.15c1.178,0.546,2.415,0.802,3.635,0.802c3.2,0,6.272-1.809,7.723-4.898C117.41,415.964,115.584,410.879,111.317,408.873z";

  // Top-right node area
  const topRightNode = "M477.868,214.332c0-4.719-3.814-8.533-8.533-8.533s-8.533,3.814-8.533,8.533v25.6c0,4.719,3.814,8.533,8.533,8.533s8.533-3.814,8.533-8.533V214.332z";

  // Bottom-right node with connections
  const bottomRightNode = "M477.868,343.195v-17.929c0-4.719-3.814-8.533-8.533-8.533s-8.533,3.814-8.533,8.533v17.929c-9.549,1.946-17.809,7.211-23.885,14.387l-7.748-7.748c-3.336-3.336-8.73-3.336-12.066,0c-3.337,3.328-3.337,8.73,0,12.066l11.401,11.401c-1.075,3.746-1.835,7.612-1.835,11.699c0,3.789,0.657,7.398,1.587,10.897l-27.571,12.979c-4.258,2.005-6.093,7.091-4.087,11.358c1.451,3.089,4.523,4.898,7.731,4.898c1.212,0,2.449-0.256,3.627-0.811l27.938-13.15c7.817,9.967,19.823,16.495,33.442,16.495c23.526,0,42.667-19.14,42.667-42.667C512.001,364.392,497.315,347.163,477.868,343.195z";

  // Main cloud/network shape in center
  const cloudNetwork = "M405.032,346.3c2.185,0,4.369-0.836,6.033-2.5c3.337-3.337,3.337-8.738,0-12.066l-6.332-6.34c8.439-11.281,13.397-25.583,13.397-41.574c0-31.386-19.021-58.394-46.097-66.79c-0.879-10.726-3.601-20.915-7.688-30.37l22.784-12.663c4.122-2.287,5.606-7.484,3.311-11.597c-2.287-4.122-7.467-5.623-11.605-3.319l-22.63,12.578c-17.007-25.651-45.764-42.658-78.191-42.658c-29.508,0-58.104,14.114-76.322,37.274c-7.501-2.705-15.693-3.14-22.494-3.14c-11.52,0-21.862,3.507-30.165,9.489l-17.058-10.667c-3.985-2.517-9.25-1.289-11.759,2.714c-2.492,3.994-1.28,9.267,2.722,11.759l14.037,8.772c-5.128,7.842-8.073,17.331-8.073,27.784v0.256c-21.743,12.646-35.038,36.386-35.038,63.258c0,17.997,6.025,34.509,16.026,47.386c-0.691,2.347-0.478,4.924,0.981,7.117c1.638,2.466,4.344,3.797,7.108,3.797c0.691,0,1.382-0.128,2.065-0.299c11.93,10.214,27.051,16.367,43.503,16.367h189.312c15.292,0,28.996-4.932,39.885-13.32l6.255,6.255C400.672,345.464,402.848,346.3,405.032,346.3z M388.87,317.662c-0.845,0.401-1.673,0.87-2.372,1.57c-0.768,0.768-1.314,1.664-1.724,2.603c-8.388,7.501-19.439,11.964-31.915,11.964H163.547c-29.013,0-52.617-25.711-52.617-57.301c0-22.178,11.571-41.506,30.191-50.432l4.847-2.313v-5.376c0-0.666,0.043-1.331,0.111-2.475l-0.111-2.918c0-19.004,13.978-32.785,33.229-32.785c19.149,0,34.133,14.993,34.133,34.133c0,4.719,3.823,8.533,8.533,8.533c4.719,0,8.533-3.814,8.533-8.533c0-14.686-5.905-27.725-15.505-36.975c14.899-19.106,39.014-31.292,63.121-31.292c39.014,0,71.629,30.08,76.578,68.702c-7.049-0.887-15.77-1.468-23.074-0.333c-4.659,0.708-7.859,5.052-7.151,9.711c0.717,4.668,5.137,7.868,9.719,7.151c9.566-1.451,24.704,1.186,29.739,2.338c0.631,0.137,1.271,0.205,1.894,0.205c0.495,0,0.956-0.162,1.442-0.247c19.874,6.298,33.903,26.479,33.903,50.227C401.064,297.131,396.499,308.881,388.87,317.662z";

  // Top-left node detail
  const topLeftDetail = "M34.134,162.269v26.462c0,4.719,3.823,8.533,8.533,8.533c4.71,0,8.533-3.814,8.533-8.533v-26.462c9.941-2.031,18.5-7.646,24.627-15.292l18.159,11.358c1.408,0.879,2.97,1.297,4.514,1.297c2.842,0,5.623-1.425,7.245-4.011c2.5-4.002,1.28-9.267-2.714-11.759l-19.405-12.126c0.998-3.61,1.707-7.347,1.707-11.273c0-6.511-1.587-12.621-4.207-18.15l30.49-12.561c4.352-1.792,6.426-6.775,4.642-11.136c-1.801-4.361-6.793-6.417-11.145-4.642L73.55,86.971c-1.016,0.427-1.886,1.05-2.628,1.766c-7.543-6.724-17.374-10.94-28.254-10.94c-23.526,0-42.667,19.14-42.667,42.667C0.001,141.073,14.687,158.301,34.134,162.269z";

  // Top-right node detail
  const topRightDetail = "M400.393,89.756l30.481,12.553c-2.62,5.53-4.207,11.639-4.207,18.159c0,3.874,0.691,7.552,1.655,11.127l-19.635,10.914c-4.13,2.287-5.615,7.484-3.319,11.597c1.562,2.807,4.463,4.395,7.467,4.395c1.399,0,2.825-0.341,4.13-1.075l19.081-10.607c6.135,7.731,14.746,13.406,24.755,15.454v26.462c0,4.71,3.814,8.533,8.533,8.533s8.533-3.823,8.533-8.533v-26.462C497.314,158.305,512,141.067,512,120.468c0-23.526-19.14-42.667-42.667-42.667c-10.872,0-20.71,4.215-28.254,10.94c-0.742-0.725-1.613-1.348-2.628-1.766L406.895,73.97c-4.361-1.775-9.344,0.299-11.145,4.642C393.958,82.972,396.032,87.956,400.393,89.756z";

  // Bottom center node
  const bottomCenter = "M308.03,452.474l-11.443,5.385c-5.376-17.417-21.427-30.191-40.585-30.191s-35.217,12.774-40.593,30.191l-11.435-5.385c-4.258-1.98-9.344-0.179-11.358,4.087c-2.005,4.267-0.179,9.353,4.087,11.366l17.203,8.098C216.724,496.838,234.422,513,256.003,513c21.572,0,39.279-16.162,42.086-36.975l17.212-8.098c4.267-2.014,6.093-7.1,4.087-11.366C317.374,452.294,312.288,450.494,308.03,452.474z";

  // Top center node
  const topCenter = "M203.055,51.415c1.084,0,2.185-0.205,3.243-0.64l7.45-3.063c2.065,21.606,20.113,38.622,42.257,38.622c22.135,0,40.183-17.015,42.257-38.622l7.441,3.063c1.058,0.435,2.159,0.64,3.243,0.64c3.354,0,6.537-1.988,7.893-5.282c1.792-4.361-0.282-9.344-4.634-11.145l-16.555-6.818C289.429,12.307,274.052,1,256.004,1s-33.434,11.307-39.654,27.17l-16.546,6.818c-4.361,1.801-6.434,6.784-4.642,11.145C196.518,49.427,199.701,51.415,203.055,51.415z";

  // Parse all paths with reduced sampling for performance
  const scale = 1.2;
  const sampleMultiplier = 0.35;
  const allPaths = [topLeftNode, bottomLeftNode, topRightNode, bottomRightNode, cloudNetwork, topLeftDetail, topRightDetail, bottomCenter, topCenter];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Generate falling person shape using SVG path data
function generateFallingPersonPoints() {
  const points = [];

  // SVG viewBox: 0 0 32 32
  const viewBox = "0 0 32 32";

  // Main falling person path
  const personPath = "M30.052 8.772l-0.337-0.659c-0.372-0.728-1.263-1.018-1.992-0.646l-5.919 3.022c-0.316 0.161-0.549 0.42-0.681 0.721-0.078 0.102-0.143 0.215-0.194 0.34l-1.451 3.571-0.514-0.733-3.122-5.355v-6.029c0-0.818-0.663-1.481-1.48-1.481h-0.74c-0.817 0-1.48 0.663-1.48 1.481v6.649c0 0.338 0.113 0.649 0.303 0.898 0.009 0.017 0.018 0.034 0.028 0.050l2.671 4.581-4.581 3.215 0.381-3.049c0.065-0.516-0.145-1.002-0.513-1.315l-4.141-5.117c-0.514-0.636-1.446-0.734-2.082-0.219l-0.575 0.466c-0.635 0.514-0.733 1.447-0.219 2.083l3.736 4.618-0.703 5.623c-0.036 0.285 0.013 0.562 0.125 0.805 0.040 0.192 0.118 0.379 0.238 0.549l2.55 3.637c0.021 0.029 0.043 0.058 0.065 0.085 0.126 0.367 0.394 0.684 0.773 0.862l6.021 2.815c0.015 0.007 0.031 0.014 0.046 0.020 0.493 0.336 1.163 0.352 1.681-0.010l5.447-3.809c0.67-0.469 0.834-1.392 0.365-2.062l-0.424-0.607c-0.468-0.67-1.391-0.834-2.061-0.366l-4.38 3.063-2.967-1.387 7.189-5.044c0.174-0.122 0.313-0.274 0.416-0.445 0.135-0.135 0.246-0.299 0.322-0.487l2.3-5.658 5.253-2.682c0.728-0.372 1.017-1.264 0.645-1.992z";

  // Head circle (approximated as path)
  const headPath = "M8.499 27.249c0 2.071-1.679 3.75-3.75 3.75s-3.75-1.679-3.75-3.75c0-2.071 1.679-3.75 3.75-3.75s3.75 1.679 3.75 3.75z";

  // Parse all paths
  const scale = 1.2;
  const sampleMultiplier = 0.5;
  const allPaths = [personPath, headPath];

  for (const pathData of allPaths) {
    const parsed = parseSVGPath(pathData, viewBox, 0, 0, scale, 0, 0, sampleMultiplier);
    points.push(...parsed);
  }

  return points;
}

// Generate wireframe buttons shape - two rectangular buttons side by side
function generateButtonsShape() {
  const points = [];
  const buttonWidth = 0.6;
  const buttonHeight = 0.18;
  const buttonGap = 0.15;
  const buttonY = -0.4; // Below center
  const depth = 0.1;

  // Left button (Fullstack Projects)
  const leftX = -buttonWidth - buttonGap / 2;
  // Front face
  points.push([
    { x: leftX, y: buttonY + buttonHeight / 2, z: depth },
    { x: leftX + buttonWidth, y: buttonY + buttonHeight / 2, z: depth },
    { x: leftX + buttonWidth, y: buttonY - buttonHeight / 2, z: depth },
    { x: leftX, y: buttonY - buttonHeight / 2, z: depth },
    { x: leftX, y: buttonY + buttonHeight / 2, z: depth },
  ]);
  // Back face
  points.push([
    { x: leftX, y: buttonY + buttonHeight / 2, z: -depth },
    { x: leftX + buttonWidth, y: buttonY + buttonHeight / 2, z: -depth },
    { x: leftX + buttonWidth, y: buttonY - buttonHeight / 2, z: -depth },
    { x: leftX, y: buttonY - buttonHeight / 2, z: -depth },
    { x: leftX, y: buttonY + buttonHeight / 2, z: -depth },
  ]);
  // Connecting edges
  points.push([{ x: leftX, y: buttonY + buttonHeight / 2, z: depth }, { x: leftX, y: buttonY + buttonHeight / 2, z: -depth }]);
  points.push([{ x: leftX + buttonWidth, y: buttonY + buttonHeight / 2, z: depth }, { x: leftX + buttonWidth, y: buttonY + buttonHeight / 2, z: -depth }]);
  points.push([{ x: leftX + buttonWidth, y: buttonY - buttonHeight / 2, z: depth }, { x: leftX + buttonWidth, y: buttonY - buttonHeight / 2, z: -depth }]);
  points.push([{ x: leftX, y: buttonY - buttonHeight / 2, z: depth }, { x: leftX, y: buttonY - buttonHeight / 2, z: -depth }]);

  // Right button (AI/ML Projects)
  const rightX = buttonGap / 2;
  // Front face
  points.push([
    { x: rightX, y: buttonY + buttonHeight / 2, z: depth },
    { x: rightX + buttonWidth, y: buttonY + buttonHeight / 2, z: depth },
    { x: rightX + buttonWidth, y: buttonY - buttonHeight / 2, z: depth },
    { x: rightX, y: buttonY - buttonHeight / 2, z: depth },
    { x: rightX, y: buttonY + buttonHeight / 2, z: depth },
  ]);
  // Back face
  points.push([
    { x: rightX, y: buttonY + buttonHeight / 2, z: -depth },
    { x: rightX + buttonWidth, y: buttonY + buttonHeight / 2, z: -depth },
    { x: rightX + buttonWidth, y: buttonY - buttonHeight / 2, z: -depth },
    { x: rightX, y: buttonY - buttonHeight / 2, z: -depth },
    { x: rightX, y: buttonY + buttonHeight / 2, z: -depth },
  ]);
  // Connecting edges
  points.push([{ x: rightX, y: buttonY + buttonHeight / 2, z: depth }, { x: rightX, y: buttonY + buttonHeight / 2, z: -depth }]);
  points.push([{ x: rightX + buttonWidth, y: buttonY + buttonHeight / 2, z: depth }, { x: rightX + buttonWidth, y: buttonY + buttonHeight / 2, z: -depth }]);
  points.push([{ x: rightX + buttonWidth, y: buttonY - buttonHeight / 2, z: depth }, { x: rightX + buttonWidth, y: buttonY - buttonHeight / 2, z: -depth }]);
  points.push([{ x: rightX, y: buttonY - buttonHeight / 2, z: depth }, { x: rightX, y: buttonY - buttonHeight / 2, z: -depth }]);

  return points;
}

// Generate expanded project list with back arrow
function generateExpandedProjectList(type) {
  const points = [];
  const scale = 0.9;

  // Large circle that expands outward
  const circleRadius = 0.85;
  const circlePoints = [];
  for (let angle = 0; angle <= Math.PI * 2; angle += Math.PI / 32) {
    circlePoints.push({
      x: Math.cos(angle) * circleRadius * scale,
      y: Math.sin(angle) * circleRadius * scale,
      z: 0,
    });
  }
  points.push(circlePoints);

  // Back arrow in top-left
  const arrowX = -0.65 * scale;
  const arrowY = 0.65 * scale;
  const arrowSize = 0.12 * scale;
  // Arrow stem
  points.push([
    { x: arrowX - arrowSize, y: arrowY, z: 0 },
    { x: arrowX + arrowSize, y: arrowY, z: 0 },
  ]);
  // Arrow head
  points.push([
    { x: arrowX - arrowSize, y: arrowY, z: 0 },
    { x: arrowX - arrowSize / 2, y: arrowY + arrowSize / 2, z: 0 },
  ]);
  points.push([
    { x: arrowX - arrowSize, y: arrowY, z: 0 },
    { x: arrowX - arrowSize / 2, y: arrowY - arrowSize / 2, z: 0 },
  ]);

  // Project list items (rectangles representing project cards)
  const itemHeight = 0.15;
  const itemWidth = 0.9;
  const startY = 0.35;
  const itemGap = 0.22;
  const numItems = type === 'fullstack' ? 4 : 3;

  for (let i = 0; i < numItems; i++) {
    const itemY = startY - i * itemGap;
    const depth = 0.05;

    // Front rectangle
    points.push([
      { x: -itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: depth },
      { x: itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: depth },
      { x: itemWidth / 2 * scale, y: (itemY - itemHeight / 2) * scale, z: depth },
      { x: -itemWidth / 2 * scale, y: (itemY - itemHeight / 2) * scale, z: depth },
      { x: -itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: depth },
    ]);

    // Back rectangle
    points.push([
      { x: -itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: -depth },
      { x: itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: -depth },
      { x: itemWidth / 2 * scale, y: (itemY - itemHeight / 2) * scale, z: -depth },
      { x: -itemWidth / 2 * scale, y: (itemY - itemHeight / 2) * scale, z: -depth },
      { x: -itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: -depth },
    ]);

    // Connecting corners
    points.push([
      { x: -itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: depth },
      { x: -itemWidth / 2 * scale, y: (itemY + itemHeight / 2) * scale, z: -depth },
    ]);
    points.push([
      { x: itemWidth / 2 * scale, y: (itemY - itemHeight / 2) * scale, z: depth },
      { x: itemWidth / 2 * scale, y: (itemY - itemHeight / 2) * scale, z: -depth },
    ]);
  }

  // Add depth circles
  for (let z of [-0.15, 0.15]) {
    const depthCircle = [];
    for (let angle = 0; angle <= Math.PI * 2; angle += Math.PI / 16) {
      depthCircle.push({
        x: Math.cos(angle) * circleRadius * 0.95 * scale,
        y: Math.sin(angle) * circleRadius * 0.95 * scale,
        z,
      });
    }
    points.push(depthCircle);
  }

  return points;
}

// Interpolate between two shapes
function interpolateShapes(shape1, shape2, progress) {
  const result = [];
  const maxLines = Math.max(shape1.length, shape2.length);

  for (let i = 0; i < maxLines; i++) {
    const line1 = shape1[i % shape1.length] || [];
    const line2 = shape2[i % shape2.length] || [];
    const maxPoints = Math.max(line1.length, line2.length);
    const interpolatedLine = [];

    for (let j = 0; j < maxPoints; j++) {
      const p1 = line1[j % Math.max(line1.length, 1)] || { x: 0, y: 0, z: 0 };
      const p2 = line2[j % Math.max(line2.length, 1)] || { x: 0, y: 0, z: 0 };

      interpolatedLine.push({
        x: p1.x + (p2.x - p1.x) * progress,
        y: p1.y + (p2.y - p1.y) * progress,
        z: p1.z + (p2.z - p1.z) * progress,
      });
    }
    result.push(interpolatedLine);
  }

  return result;
}

// 3D to 2D projection
function project(point, rotationX, rotationY, rotationZ, perspective, centerX, centerY, scale) {
  // Apply rotation around Y axis (for spin)
  let x = point.x * Math.cos(rotationY) - point.z * Math.sin(rotationY);
  let z = point.x * Math.sin(rotationY) + point.z * Math.cos(rotationY);
  let y = point.y;

  // Apply rotation around X axis (for mouse tilt)
  const y2 = y * Math.cos(rotationX) - z * Math.sin(rotationX);
  const z2 = y * Math.sin(rotationX) + z * Math.cos(rotationX);
  y = y2;
  z = z2;

  // Apply rotation around Z axis
  const x3 = x * Math.cos(rotationZ) - y * Math.sin(rotationZ);
  const y3 = x * Math.sin(rotationZ) + y * Math.cos(rotationZ);
  x = x3;
  y = y3;

  // Perspective projection
  const fov = perspective;
  const zOffset = 3;
  const projectionScale = fov / (fov + z + zOffset);

  return {
    x: centerX + x * scale * projectionScale,
    y: centerY - y * scale * projectionScale,
    depth: z,
    scale: projectionScale,
  };
}

// Logo markers configuration - scattered like continents
const LOGO_MARKERS = [
  { id: 'fullstack', lat: 0, lon: 0, shape: 'fullstack' },
  { id: 'aiml', lat: 0, lon: 180, shape: 'neuralNetwork' },
  { id: 'amazon', lat: 35, lon: 60, shape: 'amazon' },
  { id: 'cohere', lat: -25, lon: 120, shape: 'cohereHealth' },
  { id: 'nber', lat: 30, lon: 240, shape: 'nber' },
  { id: 'northeastern', lat: -20, lon: 300, shape: 'northeastern' },
  { id: 'skills-languages', lat: -45, lon: 45, shape: 'codeIcon' }
];

// Convert lat/lon to 3D sphere position
function latLonToSpherePosition(lat, lon, radius = 1) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return {
    x: radius * Math.cos(latRad) * Math.sin(lonRad),
    y: radius * Math.sin(latRad),
    z: radius * Math.cos(latRad) * Math.cos(lonRad)
  };
}

const WireframeSphere = ({
  currentShape = 'sphere',
  mousePosition = { x: 0.5, y: 0.5 },
  isSpinning = true,
  // New props for transition effects
  backgroundShape = null, // Show this shape dimly in background (e.g., 'fullstack' or 'neuralNetwork')
  hoveredProjectIndex = -1, // Which project is being hovered (-1 = none)
  isTransitioning = false, // Whether we're in the hyperspace transition
  transitionProgress = 0, // 0 to 1 progress of hyperspace transition
  onTransitionComplete = null, // Callback when transition finishes
  // New props for globe world
  scale = 1, // External scale multiplier (for zoom)
  onLogoClick = null, // Logo click callback
  onLogoHover = null, // Logo hover callback
  hoveredLogo = null, // Currently hovered logo
  showMarkers = true, // Show/hide logo markers
  insideMode = false, // Render as inside-sphere background
  enableDrag = true, // Enable drag-to-rotate
  zoomTarget = null, // { lat, lon } for centered zoom
  zoomProgress = 0, // 0 to 1 for zoom animation progress
  isZooming = false, // Whether zoom transition is active (expands canvas to full viewport)
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const rotationRef = useRef(0);
  const displayRotationRef = useRef(0); // Smooth rotation for display
  const morphProgressRef = useRef(0);
  const previousShapeRef = useRef('sphere');
  const targetShapeRef = useRef('sphere');

  // Refs for hyperspace effect
  const hyperspaceParticlesRef = useRef([]);
  const transitionStartTimeRef = useRef(null);
  const internalTransitionProgressRef = useRef(0);

  // Refs for drag rotation with momentum
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastDragPosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const velocityHistoryRef = useRef([]);
  const rotationStateRef = useRef({ x: 0, y: 0 });
  const markerHitboxesRef = useRef([]);

  // Drag physics constants
  const FRICTION = 0.97;
  const VELOCITY_THRESHOLD = 0.0001;
  const SENSITIVITY = 0.005;
  const CLICK_THRESHOLD = 5; // pixels - if drag distance < threshold, treat as click

  // Memoize shape data
  const shapeData = useMemo(() => SHAPES, []);

  // Handle shape transitions
  useEffect(() => {
    if (currentShape !== targetShapeRef.current) {
      previousShapeRef.current = targetShapeRef.current;
      targetShapeRef.current = currentShape;
      morphProgressRef.current = 0;
    }
  }, [currentShape]);

  // Initialize hyperspace particles when transition starts
  useEffect(() => {
    if (isTransitioning && hyperspaceParticlesRef.current.length === 0) {
      transitionStartTimeRef.current = Date.now();
      internalTransitionProgressRef.current = 0;

      // Get the current shape points to explode
      const sourceShape = shapeData[backgroundShape] || shapeData.fullstack;
      const particles = [];

      // Create line segments from shape - these will break off and fly toward camera
      sourceShape.forEach((line, lineIndex) => {
        if (line.length < 2) return;

        // Create a particle for each line segment
        for (let i = 0; i < line.length - 1; i++) {
          const p1 = line[i];
          const p2 = line[i + 1];

          // Calculate center of segment
          const centerX = (p1.x + p2.x) / 2;
          const centerY = (p1.y + p2.y) / 2;
          const centerZ = (p1.z + p2.z) / 2;

          particles.push({
            // Store the line segment points (relative to center)
            lineStart: { x: p1.x - centerX, y: p1.y - centerY, z: p1.z - centerZ },
            lineEnd: { x: p2.x - centerX, y: p2.y - centerY, z: p2.z - centerZ },
            // Center position that will move
            x: centerX,
            y: centerY,
            z: centerZ,
            // Slower velocity toward camera - let them linger
            vx: (Math.random() - 0.5) * 0.015,
            vy: (Math.random() - 0.5) * 0.015,
            vz: -0.06 - Math.random() * 0.08,
            // Longer stagger - lines break off over 0-60% of transition
            delay: Math.random() * 0.6,
            // Slight rotation as it flies
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
          });
        }
      });

      hyperspaceParticlesRef.current = particles;
    } else if (!isTransitioning) {
      // Reset when transition ends
      hyperspaceParticlesRef.current = [];
      transitionStartTimeRef.current = null;
      internalTransitionProgressRef.current = 0;
    }
  }, [isTransitioning, backgroundShape, shapeData]);

  // Handle resize - full viewport when zooming, 80% otherwise
  useEffect(() => {
    const updateDimensions = () => {
      if (isZooming) {
        // Full viewport during zoom transition
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      } else {
        const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
        setDimensions({ width: size, height: size });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isZooming]);

  // Drag event handlers
  const handleMouseDown = useCallback((e) => {
    if (!enableDrag) return;

    // Only capture events within the sphere area (circular hitbox)
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const sphereRadius = Math.min(rect.width, rect.height) * 0.45; // Slightly larger than visual sphere

      const distFromCenter = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) +
        Math.pow(e.clientY - centerY, 2)
      );

      // If click is outside sphere area, don't capture it (let it pass to buttons)
      if (distFromCenter > sphereRadius) {
        return;
      }
    }

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastDragPosRef.current = { x: e.clientX, y: e.clientY };
    velocityHistoryRef.current = [];
    velocityRef.current = { x: 0, y: 0 };
  }, [enableDrag]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check hover on markers
    if (onLogoHover && showMarkers && !isDraggingRef.current) {
      let foundHover = null;
      // Check hitboxes in reverse order (front markers first)
      for (let i = markerHitboxesRef.current.length - 1; i >= 0; i--) {
        const hitbox = markerHitboxesRef.current[i];
        if (hitbox && hitbox.depth > -0.2) { // Only front-facing markers
          const dx = x - hitbox.x;
          const dy = y - hitbox.y;
          if (Math.abs(dx) < hitbox.size / 2 && Math.abs(dy) < hitbox.size / 2) {
            foundHover = hitbox.id;
            break;
          }
        }
      }
      onLogoHover(foundHover);
    }

    if (!isDraggingRef.current || !enableDrag) return;

    const dx = e.clientX - lastDragPosRef.current.x;
    const dy = e.clientY - lastDragPosRef.current.y;

    // Update rotation state
    rotationStateRef.current.y += dx * SENSITIVITY;
    rotationStateRef.current.x += dy * SENSITIVITY;

    // Clamp X rotation to prevent flipping
    rotationStateRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationStateRef.current.x));

    // Track velocity history (last 5 frames)
    velocityHistoryRef.current.push({ x: dx * SENSITIVITY, y: dy * SENSITIVITY, time: Date.now() });
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }

    lastDragPosRef.current = { x: e.clientX, y: e.clientY };
  }, [enableDrag, onLogoHover, showMarkers]);

  const handleMouseUp = useCallback((e) => {
    if (!isDraggingRef.current) return;

    // Check if this was a click (not a drag)
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartRef.current.x, 2) +
      Math.pow(e.clientY - dragStartRef.current.y, 2)
    );

    if (dragDistance < CLICK_THRESHOLD && onLogoClick && showMarkers) {
      // This was a click - check if we clicked a marker
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check hitboxes in reverse order (front markers first)
        for (let i = markerHitboxesRef.current.length - 1; i >= 0; i--) {
          const hitbox = markerHitboxesRef.current[i];
          if (hitbox && hitbox.depth > -0.2) { // Only front-facing markers
            const dx = x - hitbox.x;
            const dy = y - hitbox.y;
            if (Math.abs(dx) < hitbox.size / 2 && Math.abs(dy) < hitbox.size / 2) {
              onLogoClick(hitbox.id);
              break;
            }
          }
        }
      }
    }

    isDraggingRef.current = false;

    // Calculate average velocity from history
    if (velocityHistoryRef.current.length > 0) {
      const avgVx = velocityHistoryRef.current.reduce((sum, v) => sum + v.x, 0) / velocityHistoryRef.current.length;
      const avgVy = velocityHistoryRef.current.reduce((sum, v) => sum + v.y, 0) / velocityHistoryRef.current.length;
      velocityRef.current = { x: avgVx, y: avgVy };
    }
  }, [onLogoClick, showMarkers]);

  const handleTouchStart = useCallback((e) => {
    if (!enableDrag || e.touches.length !== 1) return;
    const touch = e.touches[0];

    // Only capture events within the sphere area (circular hitbox)
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const sphereRadius = Math.min(rect.width, rect.height) * 0.45;

      const distFromCenter = Math.sqrt(
        Math.pow(touch.clientX - centerX, 2) +
        Math.pow(touch.clientY - centerY, 2)
      );

      if (distFromCenter > sphereRadius) {
        return;
      }
    }

    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }, [enableDrag, handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    if (!enableDrag || e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }, [enableDrag, handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      handleMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }, [handleMouseUp]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enableDrag) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableDrag, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas with transparency
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    // Increased baseScale to 0.7 for larger globe, multiplied by external scale
    // 15% smaller in inner mode (when showMarkers is false)
    const innerModeScale = showMarkers ? 1 : 0.85;
    const baseScale = Math.min(width, height) * 0.7 * scale * innerModeScale;
    // Adjust perspective for inside mode
    const perspective = insideMode ? -2 : 4;

    // Apply momentum physics when not dragging
    if (!isDraggingRef.current && enableDrag) {
      const vx = velocityRef.current.x;
      const vy = velocityRef.current.y;

      if (Math.abs(vx) > VELOCITY_THRESHOLD || Math.abs(vy) > VELOCITY_THRESHOLD) {
        rotationStateRef.current.y += vx;
        rotationStateRef.current.x += vy;
        // Clamp X rotation
        rotationStateRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationStateRef.current.x));
        velocityRef.current.x *= FRICTION;
        velocityRef.current.y *= FRICTION;
      }
    }

    // Calculate transition progress (2 second duration)
    const TRANSITION_DURATION = 2000; // 2 seconds
    if (isTransitioning && transitionStartTimeRef.current) {
      const elapsed = Date.now() - transitionStartTimeRef.current;
      internalTransitionProgressRef.current = Math.min(1, elapsed / TRANSITION_DURATION);

      // Call completion callback when done
      if (internalTransitionProgressRef.current >= 1 && onTransitionComplete) {
        onTransitionComplete();
      }
    }

    const tProgress = internalTransitionProgressRef.current;

    // Only spin when isSpinning is true (sphere shape) and not dragging
    if (isSpinning && targetShapeRef.current === 'sphere' && !isTransitioning && !isDraggingRef.current) {
      rotationRef.current -= 0.003;
    }

    // Smoothly interpolate display rotation
    const isSphere = targetShapeRef.current === 'sphere';
    const targetRotation = isSphere ? rotationRef.current : 0;
    const lerpSpeed = isSphere ? 0.1 : 0.08;
    displayRotationRef.current += (targetRotation - displayRotationRef.current) * lerpSpeed;

    // Update morph progress
    if (morphProgressRef.current < 1) {
      morphProgressRef.current = Math.min(1, morphProgressRef.current + 0.02);
    }

    // Calculate rotation - blend mouse influence with drag state
    const mouseInfluenceX = (mousePosition.y - 0.5) * 0.3;
    const mouseInfluenceY = (mousePosition.x - 0.5) * 0.2;

    // Base rotation values
    let baseRotationX = enableDrag
      ? rotationStateRef.current.x + mouseInfluenceX
      : (mousePosition.y - 0.5) * 0.5;
    let baseRotationY = enableDrag
      ? rotationStateRef.current.y + displayRotationRef.current + mouseInfluenceY
      : displayRotationRef.current + (mousePosition.x - 0.5) * 0.3;

    // Apply zoom target centering during zoom animation
    let mouseRotationX = baseRotationX;
    let mouseRotationY = baseRotationY;

    if (zoomTarget && zoomProgress > 0) {
      // Calculate target rotation to center on the lat/lon
      // Convert lat/lon to rotation angles (radians)
      const targetRotX = -(zoomTarget.lat * Math.PI) / 180; // Negative because we rotate the camera
      const targetRotY = -(zoomTarget.lon * Math.PI) / 180 - Math.PI / 2; // Offset to face camera

      // Ease the zoom progress for smoother centering
      const easedProgress = zoomProgress < 0.5
        ? 2 * zoomProgress * zoomProgress
        : 1 - Math.pow(-2 * zoomProgress + 2, 2) / 2;

      // Interpolate from current rotation to target rotation
      mouseRotationX = baseRotationX + (targetRotX - baseRotationX) * easedProgress;
      mouseRotationY = baseRotationY + (targetRotY - baseRotationY) * easedProgress;
    }

    // === DRAW BACKGROUND SHAPE (when in expanded mode, NOT during transition) ===
    // During transition, the line segments are drawn by the particle system instead
    if (backgroundShape && shapeData[backgroundShape] && !isTransitioning) {
      const bgPoints = shapeData[backgroundShape];
      const bgLinesToDraw = [];

      bgPoints.forEach((line) => {
        if (line.length < 2) return;
        const projectedPoints = line.map((point) =>
          project(point, mouseRotationX, mouseRotationY, 0, perspective, centerX, centerY, baseScale)
        );
        const avgDepth = projectedPoints.reduce((sum, p) => sum + p.depth, 0) / projectedPoints.length;
        bgLinesToDraw.push({ points: projectedPoints, depth: avgDepth });
      });

      bgLinesToDraw.sort((a, b) => a.depth - b.depth);

      bgLinesToDraw.forEach(({ points, depth }) => {
        // Higher opacity for the background icon - it's the main visual element now
        const baseOpacity = hoveredProjectIndex >= 0 ? 0.4 : 0.3;
        const opacity = Math.max(0.1, Math.min(0.5, baseOpacity + depth * 0.1));

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `rgba(0, 255, 65, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Add subtle glow
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    }

    // === HYPERSPACE TRANSITION EFFECT (3 phases) ===
    // Phase 1 (0-33%): Icon breaks apart, person fades in
    // Phase 2 (33-66%): Lines fly toward screen, person falls/shrinks
    // Phase 3 (66-100%): Lines off screen, person tiny
    if (isTransitioning && tProgress > 0) {
      const particles = hyperspaceParticlesRef.current;

      // Update line segment positions
      particles.forEach((particle) => {
        // Only move after delay (staggered break-off)
        if (tProgress > particle.delay) {
          const particleProgress = (tProgress - particle.delay) / (1 - particle.delay);

          // Accelerate as they fly
          const acceleration = 1 + particleProgress * 2;
          particle.x += particle.vx * acceleration;
          particle.y += particle.vy * acceleration;
          particle.z += particle.vz * acceleration;

          // Rotate slightly as flying
          particle.rotation += particle.rotationSpeed;
        }
      });

      // Draw the line segments (the actual breaking-off lines)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      particles.forEach((particle) => {
        // Only draw if not too far past camera
        if (particle.z > -5) {
          const hasDetached = tProgress > particle.delay;

          // Calculate line endpoints in world space
          const cos = Math.cos(particle.rotation);
          const sin = Math.sin(particle.rotation);

          // Rotate line around its center
          const rotatedStart = {
            x: particle.x + (particle.lineStart.x * cos - particle.lineStart.y * sin),
            y: particle.y + (particle.lineStart.x * sin + particle.lineStart.y * cos),
            z: particle.z + particle.lineStart.z,
          };
          const rotatedEnd = {
            x: particle.x + (particle.lineEnd.x * cos - particle.lineEnd.y * sin),
            y: particle.y + (particle.lineEnd.x * sin + particle.lineEnd.y * cos),
            z: particle.z + particle.lineEnd.z,
          };

          // Project to screen
          const p1 = project(rotatedStart, mouseRotationX, mouseRotationY, 0, perspective, centerX, centerY, baseScale);
          const p2 = project(rotatedEnd, mouseRotationX, mouseRotationY, 0, perspective, centerX, centerY, baseScale);

          if (p1.scale > 0 && p2.scale > 0) {
            // Lines that haven't detached yet are part of the icon (dimmer)
            // Lines that have detached are bright and flying
            let opacity, lineWidth;

            if (!hasDetached) {
              // Still attached to icon - dim
              opacity = 0.3;
              lineWidth = 1;
            } else {
              // Detached and flying - bright, gets larger as it approaches
              opacity = Math.min(1, p1.scale) * 0.95;
              lineWidth = Math.max(1.5, 4 * p1.scale);
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 255, 65, ${opacity})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          }
        }
      });

      // Draw falling person - 3 phase animation
      // Phase 1: Fade in (0-20%)
      // Phase 2: Full visibility, start shrinking (20-50%)
      // Phase 3: Shrinking fast (50-100%)
      const personFadeIn = Math.min(1, tProgress / 0.2); // Fade in 0-20%
      const shrinkStart = 0.2;
      const shrinkProgress = Math.max(0, (tProgress - shrinkStart) / (1 - shrinkStart));
      const personScale = baseScale * (1 - shrinkProgress * 0.98); // Shrink to 2%
      const personOpacity = personFadeIn * (1 - shrinkProgress * 0.85);

      if (personOpacity > 0.01 && personScale > 1) {
        const personShape = shapeData.fallingPerson;
        const personLines = [];

        personShape.forEach((line) => {
          if (line.length < 2) return;
          const projectedPoints = line.map((point) =>
            project(point, 0, 0, 0, perspective, centerX, centerY, personScale)
          );
          const avgDepth = projectedPoints.reduce((sum, p) => sum + p.depth, 0) / projectedPoints.length;
          personLines.push({ points: projectedPoints, depth: avgDepth });
        });

        personLines.sort((a, b) => a.depth - b.depth);

        personLines.forEach(({ points, depth }) => {
          const opacity = personOpacity * Math.max(0.3, Math.min(1, 0.6 + depth * 0.2));

          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.strokeStyle = `rgba(0, 255, 65, ${opacity})`;
          ctx.lineWidth = Math.max(0.5, 2 * (1 - shrinkProgress));
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          ctx.shadowColor = '#00ff41';
          ctx.shadowBlur = 10 * (1 - shrinkProgress);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }
    }

    // === DRAW MAIN SHAPE (only when not in expanded mode with background, and not in hyperspace transition) ===
    // When backgroundShape is set and we're not transitioning, we're in expanded mode - don't draw main shape
    const shouldDrawMainShape = !backgroundShape || isTransitioning;
    if (shouldDrawMainShape && (!isTransitioning || tProgress < 0.3)) {
      const mainOpacity = isTransitioning ? (1 - tProgress / 0.3) : 1;
      const fromShape = shapeData[previousShapeRef.current] || shapeData.sphere;
      const toShape = shapeData[targetShapeRef.current] || shapeData.sphere;
      const currentPoints = interpolateShapes(fromShape, toShape, easeInOutCubic(morphProgressRef.current));

      const linesToDraw = [];

      currentPoints.forEach((line) => {
        if (line.length < 2) return;
        const projectedPoints = line.map((point) =>
          project(point, mouseRotationX, mouseRotationY, 0, perspective, centerX, centerY, baseScale)
        );
        const avgDepth = projectedPoints.reduce((sum, p) => sum + p.depth, 0) / projectedPoints.length;
        linesToDraw.push({ points: projectedPoints, depth: avgDepth });
      });

      linesToDraw.sort((a, b) => a.depth - b.depth);

      linesToDraw.forEach(({ points, depth }) => {
        const opacity = mainOpacity * Math.max(0.2, Math.min(1, 0.5 + depth * 0.3));
        const lineWidth = Math.max(0.5, 1 + depth * 0.5);

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

        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 10 + depth * 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Add subtle particle effect at line intersections
      if (Math.random() > 0.9 && !isTransitioning) {
        const randomLine = linesToDraw[Math.floor(Math.random() * linesToDraw.length)];
        if (randomLine && randomLine.points.length > 0) {
          const randomPoint = randomLine.points[Math.floor(Math.random() * randomLine.points.length)];
          ctx.beginPath();
          ctx.arc(randomPoint.x, randomPoint.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 255, 65, 0.8)';
          ctx.fill();
        }
      }
    }

    // === DRAW LOGO MARKERS (when showing sphere and markers are enabled) ===
    if (showMarkers && currentShape === 'sphere' && !isTransitioning && !insideMode && scale >= 0.9) {
      const newHitboxes = [];
      const markersToDraw = [];

      // Calculate marker positions and sort by depth
      LOGO_MARKERS.forEach((marker) => {
        const pos3D = latLonToSpherePosition(marker.lat, marker.lon, 1.08); // Slightly outside sphere
        const projected = project(pos3D, mouseRotationX, mouseRotationY, 0, perspective, centerX, centerY, baseScale);

        markersToDraw.push({
          ...marker,
          x: projected.x,
          y: projected.y,
          depth: projected.depth,
          scale: projected.scale
        });
      });

      // Sort by depth (back to front)
      markersToDraw.sort((a, b) => a.depth - b.depth);

      // Draw markers with actual wireframe shapes
      markersToDraw.forEach((marker) => {
        // Only draw markers that are facing the camera (front half of sphere)
        const isFrontFacing = marker.depth > -0.3;
        const markerSize = 140 * marker.scale; // Much larger icons
        const isHovered = hoveredLogo === marker.id;

        // Depth-based opacity (front markers are brighter)
        let opacity = isFrontFacing
          ? Math.min(1, 0.5 + (marker.depth + 0.3) * 0.5)
          : Math.max(0.1, 0.3 + marker.depth * 0.2);

        // Increase opacity for hovered marker
        if (isHovered) {
          opacity = Math.min(1, opacity + 0.3);
        }

        // Draw the actual wireframe shape for this marker
        const shapeKey = marker.shape;
        const shapePoints = shapeData[shapeKey];

        if (shapePoints && isFrontFacing) {
          const iconScale = (isHovered ? markerSize * 1.3 : markerSize) * 0.5;
          const lineWidth = isHovered ? 1.8 : 1.2;

          ctx.strokeStyle = `rgba(0, 255, 65, ${opacity})`;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Draw each line of the shape, translated and scaled to marker position
          shapePoints.forEach((line) => {
            if (line.length < 2) return;

            ctx.beginPath();
            const firstPoint = line[0];
            ctx.moveTo(
              marker.x + firstPoint.x * iconScale,
              marker.y - firstPoint.y * iconScale
            );

            for (let i = 1; i < line.length; i++) {
              const point = line[i];
              ctx.lineTo(
                marker.x + point.x * iconScale,
                marker.y - point.y * iconScale
              );
            }
            ctx.stroke();
          });

          // Add glow for hovered marker
          if (isHovered) {
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 20;
            // Redraw just the outer lines for glow effect
            shapePoints.slice(0, Math.min(5, shapePoints.length)).forEach((line) => {
              if (line.length < 2) return;
              ctx.beginPath();
              ctx.moveTo(
                marker.x + line[0].x * iconScale,
                marker.y - line[0].y * iconScale
              );
              for (let i = 1; i < line.length; i++) {
                ctx.lineTo(
                  marker.x + line[i].x * iconScale,
                  marker.y - line[i].y * iconScale
                );
              }
              ctx.stroke();
            });
            ctx.shadowBlur = 0;
          }
        }

        // Store hitbox for click detection (only for front-facing markers)
        if (isFrontFacing) {
          newHitboxes.push({
            id: marker.id,
            x: marker.x,
            y: marker.y,
            size: markerSize * 1.2, // Hitbox slightly larger than visual
            depth: marker.depth
          });
        }
      });

      markerHitboxesRef.current = newHitboxes;
    } else {
      markerHitboxesRef.current = [];
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, mousePosition, shapeData, isSpinning, backgroundShape, hoveredProjectIndex, isTransitioning, onTransitionComplete, scale, showMarkers, hoveredLogo, insideMode, enableDrag, currentShape]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Determine cursor style based on position - only show grab cursor over sphere area
  const [cursorInSphere, setCursorInSphere] = useState(false);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!enableDrag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const sphereRadius = Math.min(rect.width, rect.height) * 0.45;

    const distFromCenter = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) +
      Math.pow(e.clientY - centerY, 2)
    );

    setCursorInSphere(distFromCenter <= sphereRadius);
  }, [enableDrag]);

  // Add canvas-level mouse tracking for cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enableDrag) return;

    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseleave', () => setCursorInSphere(false));

    return () => {
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      canvas.removeEventListener('mouseleave', () => setCursorInSphere(false));
    };
  }, [enableDrag, handleCanvasMouseMove]);

  const cursorStyle = enableDrag
    ? (isDraggingRef.current ? 'grabbing' : (hoveredLogo ? 'pointer' : (cursorInSphere ? 'grab' : 'default')))
    : 'default';

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className={`wireframe-sphere ${enableDrag ? 'draggable' : ''} ${insideMode ? 'inside-mode' : ''} ${isZooming ? 'zooming' : ''}`}
      style={{ cursor: cursorStyle, pointerEvents: enableDrag ? 'auto' : 'none' }}
    />
  );
};

// Easing function for smooth morphing
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default WireframeSphere;
