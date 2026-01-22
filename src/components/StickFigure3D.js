import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 3D Wireframe Stick Figure with Speech Bubble Chat
 * Matching the globe aesthetic - early 2000s hacker green wireframe vibe
 */

// ============================================
// CONSTANTS
// ============================================

const BODY = {
  headRadius: 8,
  torsoHeight: 30,
  torsoWidthTop: 14,
  torsoWidthBottom: 10,
  torsoDepth: 8,
  upperArmLength: 14,
  forearmLength: 14,
  thighLength: 18,
  shinLength: 18,
  limbRadius: 2.5,
};

const FIGURE_HEIGHT = BODY.headRadius * 2 + BODY.torsoHeight + BODY.thighLength + BODY.shinLength;

const WIREFRAME = {
  headLatLines: 5,
  headLonLines: 8,
  torsoLatLines: 4,
  torsoLonLines: 6,
  limbLatLines: 3,
  limbLonLines: 6,
};

// Idle pose - arms straight down at sides
const IDLE_POSE = {
  shoulderL: 0,     // Arms straight down
  shoulderR: 0,     // Arms straight down
  elbowL: 0,        // Straight arms
  elbowR: 0,
  hipL: 0,
  hipR: 0,
  kneeL: 0,
  kneeR: 0,
};

// Walk cycle keyframes (side view walking)
const WALK_CYCLE = {
  frontHip:   [30, 20, 5, -10, -15, -10, 5, 20],
  backHip:    [-15, -10, 5, 20, 30, 20, 5, -10],
  frontKnee:  [0, 5, 40, 60, 40, 10, 0, 0],
  backKnee:   [40, 60, 40, 10, 0, 5, 40, 60],
  frontShoulder: [35, 20, 0, -20, -35, -20, 0, 20],
  backShoulder:  [-35, -20, 0, 20, 35, 20, 0, -20],
  frontElbow:    [30, 25, 20, 15, 20, 25, 30, 35],
  backElbow:     [20, 25, 30, 35, 30, 25, 20, 15],
  bodyY: [0, -1.5, 0, 1, 0, -1.5, 0, 1],
};

const WAVE_ANIM = {
  shoulder: [-100, -110, -100, -110],
  elbow: [-40, -60, -40, -60],
};

// Animation timing
const TURN_DURATION = 0.35; // seconds to turn
const STOP_SETTLE_DURATION = 0.2; // seconds to settle feet before turning

// ============================================
// UTILITY FUNCTIONS
// ============================================

function deg2rad(d) { return d * Math.PI / 180; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolate(keyframes, phase) {
  const len = keyframes.length;
  const idx = phase * len;
  const i = Math.floor(idx) % len;
  const next = (i + 1) % len;
  const t = idx - Math.floor(idx);
  return lerp(keyframes[i], keyframes[next], t);
}

function rotateY3D(x, y, z, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: x * c + z * s, y: y, z: -x * s + z * c };
}

function project3D(x, y, z, cx, cy, scale, perspective = 400) {
  const factor = perspective / (perspective + z);
  return { x: cx + x * scale * factor, y: cy + y * scale * factor, depth: z, scale: factor };
}

// ============================================
// 3D WIREFRAME DRAWING FUNCTIONS
// ============================================

function drawWireframeSphere(ctx, cx, cy, cz, rx, ry, rz, latLines, lonLines, bodyRotY, screenCX, screenCY, scale, opacity = 0.8) {
  const lines = [];
  for (let lat = 1; lat < latLines; lat++) {
    const theta = (lat / latLines) * Math.PI;
    const ringY = ry * Math.cos(theta);
    const ringR = Math.sin(theta);
    const points = [];
    for (let lon = 0; lon <= lonLines; lon++) {
      const phi = (lon / lonLines) * Math.PI * 2;
      const lx = rx * ringR * Math.cos(phi);
      const lz = rz * ringR * Math.sin(phi);
      const rotated = rotateY3D(lx, ringY, lz, bodyRotY);
      const proj = project3D(cx + rotated.x, cy + rotated.y, cz + rotated.z, screenCX, screenCY, scale);
      points.push(proj);
    }
    lines.push({ points, avgDepth: cz });
  }
  for (let lon = 0; lon < lonLines; lon++) {
    const phi = (lon / lonLines) * Math.PI * 2;
    const points = [];
    for (let lat = 0; lat <= latLines; lat++) {
      const theta = (lat / latLines) * Math.PI;
      const lx = rx * Math.sin(theta) * Math.cos(phi);
      const ly = ry * Math.cos(theta);
      const lz = rz * Math.sin(theta) * Math.sin(phi);
      const rotated = rotateY3D(lx, ly, lz, bodyRotY);
      const proj = project3D(cx + rotated.x, cy + rotated.y, cz + rotated.z, screenCX, screenCY, scale);
      points.push(proj);
    }
    lines.push({ points, avgDepth: cz });
  }
  drawWireframeLines(ctx, lines, opacity);
}

function drawWireframeLimb(ctx, x1, y1, z1, x2, y2, z2, radius, latLines, lonLines, bodyRotY, screenCX, screenCY, scale, opacity = 0.8) {
  const lines = [];
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length === 0) return;
  const nx = dx / length, ny = dy / length, nz = dz / length;
  let perpX, perpY, perpZ;
  if (Math.abs(ny) < 0.9) {
    perpX = nz; perpY = 0; perpZ = -nx;
  } else {
    perpX = 0; perpY = -nz; perpZ = ny;
  }
  const perpLen = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
  if (perpLen > 0) {
    perpX /= perpLen; perpY /= perpLen; perpZ /= perpLen;
  }
  const perp2X = ny * perpZ - nz * perpY;
  const perp2Y = nz * perpX - nx * perpZ;
  const perp2Z = nx * perpY - ny * perpX;

  for (let lat = 0; lat <= latLines; lat++) {
    const t = lat / latLines;
    const ringX = x1 + dx * t, ringY = y1 + dy * t, ringZ = z1 + dz * t;
    const r = radius * (1 - t * 0.15);
    const points = [];
    for (let lon = 0; lon <= lonLines; lon++) {
      const angle = (lon / lonLines) * Math.PI * 2;
      const c = Math.cos(angle), s = Math.sin(angle);
      const px = ringX + (perpX * c + perp2X * s) * r;
      const py = ringY + (perpY * c + perp2Y * s) * r;
      const pz = ringZ + (perpZ * c + perp2Z * s) * r;
      const rotated = rotateY3D(px, py, pz, bodyRotY);
      const proj = project3D(rotated.x, rotated.y, rotated.z, screenCX, screenCY, scale);
      points.push(proj);
    }
    lines.push({ points, avgDepth: ringZ });
  }
  for (let lon = 0; lon < lonLines; lon++) {
    const angle = (lon / lonLines) * Math.PI * 2;
    const c = Math.cos(angle), s = Math.sin(angle);
    const points = [];
    for (let lat = 0; lat <= latLines; lat++) {
      const t = lat / latLines;
      const r = radius * (1 - t * 0.15);
      const px = x1 + dx * t + (perpX * c + perp2X * s) * r;
      const py = y1 + dy * t + (perpY * c + perp2Y * s) * r;
      const pz = z1 + dz * t + (perpZ * c + perp2Z * s) * r;
      const rotated = rotateY3D(px, py, pz, bodyRotY);
      const proj = project3D(rotated.x, rotated.y, rotated.z, screenCX, screenCY, scale);
      points.push(proj);
    }
    lines.push({ points, avgDepth: (z1 + z2) / 2 });
  }
  drawWireframeLines(ctx, lines, opacity);
}

function drawWireframeTorso(ctx, cx, topY, bottomY, topW, bottomW, depth, latLines, lonLines, bodyRotY, screenCX, screenCY, scale, opacity = 0.8) {
  const lines = [];
  const height = bottomY - topY;
  for (let lat = 0; lat <= latLines; lat++) {
    const t = lat / latLines;
    const y = topY + height * t;
    const w = lerp(topW, bottomW, t) / 2;
    const d = depth / 2;
    const points = [];
    const segments = lonLines * 2;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = cx + Math.cos(angle) * w;
      const pz = Math.sin(angle) * d;
      const rotated = rotateY3D(px, y, pz, bodyRotY);
      const proj = project3D(rotated.x, rotated.y, rotated.z, screenCX, screenCY, scale);
      points.push(proj);
    }
    lines.push({ points, avgDepth: 0 });
  }
  const segments = lonLines * 2;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const points = [];
    for (let lat = 0; lat <= latLines; lat++) {
      const t = lat / latLines;
      const y = topY + height * t;
      const w = lerp(topW, bottomW, t) / 2;
      const d = depth / 2;
      const px = cx + Math.cos(angle) * w;
      const pz = Math.sin(angle) * d;
      const rotated = rotateY3D(px, y, pz, bodyRotY);
      const proj = project3D(rotated.x, rotated.y, rotated.z, screenCX, screenCY, scale);
      points.push(proj);
    }
    lines.push({ points, avgDepth: 0 });
  }
  drawWireframeLines(ctx, lines, opacity);
}

function drawWireframeLines(ctx, lines, baseOpacity = 0.8) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  lines.forEach(({ points }) => {
    if (points.length < 2) return;
    const avgDepth = points.reduce((sum, p) => sum + (p.depth || 0), 0) / points.length;
    const depthFactor = Math.max(0.3, Math.min(1, 1 - avgDepth / 100));
    const opacity = baseOpacity * depthFactor;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = `rgba(0, 255, 65, ${opacity})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(0, 255, 65, ${opacity * 0.4})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
}

// ============================================
// SPEECH BUBBLE COMPONENT
// ============================================

const SpeechBubble = ({ visible, expanded, onClose, opacity = 1 }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! Click on me to ask a question about Zach. I know him very well!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || "Sorry, I couldn't process that." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! Something went wrong. Try again!" }]);
    }
    setIsLoading(false);
  };

  if (!visible) return null;

  const baseStyle = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '10px',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity,
  };

  if (!expanded) {
    return (
      <div style={{
        ...baseStyle,
        width: '200px',
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1.5px solid #00ff41',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.05)',
        cursor: 'pointer',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
          borderRadius: '12px',
          pointerEvents: 'none',
        }} />
        <p style={{
          margin: 0,
          color: '#00ff41',
          fontSize: '11px',
          fontFamily: '"Courier New", monospace',
          textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
          lineHeight: 1.4,
          position: 'relative',
        }}>
          Click on me to ask about Zach!
        </p>
        <div style={{
          position: 'absolute',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid #00ff41',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(0, 0, 0, 0.9)',
        }} />
      </div>
    );
  }

  return (
    <div style={{
      ...baseStyle,
      width: '280px',
      height: '320px',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '1.5px solid #00ff41',
      borderRadius: '12px',
      boxShadow: '0 0 20px rgba(0, 255, 65, 0.4), inset 0 0 30px rgba(0, 255, 65, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 255, 65, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 65, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '10px 10px',
        pointerEvents: 'none',
        borderRadius: '12px',
      }} />
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 255, 65, 0.05)',
      }}>
        <span style={{
          color: '#00ff41',
          fontSize: '11px',
          fontFamily: '"Courier New", monospace',
          textShadow: '0 0 8px rgba(0, 255, 65, 0.5)',
        }}>
          {'>'} ZACH_ASSISTANT.exe
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: 'none',
            border: '1px solid rgba(0, 255, 65, 0.5)',
            color: '#00ff41',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '10px',
            fontFamily: '"Courier New", monospace',
            borderRadius: '3px',
          }}
        >
          [X]
        </button>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '8px 10px',
            background: msg.role === 'user'
              ? 'rgba(0, 255, 65, 0.15)'
              : 'rgba(0, 255, 65, 0.05)',
            border: `1px solid ${msg.role === 'user' ? 'rgba(0, 255, 65, 0.4)' : 'rgba(0, 255, 65, 0.2)'}`,
            borderRadius: '8px',
            color: '#00ff41',
            fontSize: '11px',
            fontFamily: '"Courier New", monospace',
            lineHeight: 1.4,
            textShadow: '0 0 5px rgba(0, 255, 65, 0.3)',
          }}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '8px 10px',
            color: '#00ff41',
            fontSize: '11px',
            fontFamily: '"Courier New", monospace',
          }}>
            <span className="loading-dots">Processing</span>
            <style>{`
              .loading-dots::after {
                content: '';
                animation: dots 1.5s infinite;
              }
              @keyframes dots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60%, 100% { content: '...'; }
              }
            `}</style>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{
        padding: '10px',
        borderTop: '1px solid rgba(0, 255, 65, 0.3)',
        display: 'flex',
        gap: '8px',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          onClick={(e) => e.stopPropagation()}
          placeholder="> Ask about Zach..."
          style={{
            flex: 1,
            background: 'rgba(0, 255, 65, 0.05)',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: '4px',
            padding: '6px 10px',
            color: '#00ff41',
            fontSize: '11px',
            fontFamily: '"Courier New", monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); handleSend(); }}
          disabled={isLoading}
          style={{
            background: 'rgba(0, 255, 65, 0.1)',
            border: '1px solid #00ff41',
            borderRadius: '4px',
            padding: '6px 12px',
            color: '#00ff41',
            fontSize: '10px',
            fontFamily: '"Courier New", monospace',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {'>>'}
        </button>
      </div>
      <div style={{
        position: 'absolute',
        bottom: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid #00ff41',
      }} />
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

// Animation states
const STATE_IDLE = 'idle';
const STATE_TURNING_TO_WALK = 'turning_to_walk';
const STATE_WALKING = 'walking';
const STATE_STOPPING = 'stopping';
const STATE_TURNING_TO_IDLE = 'turning_to_idle';

const StickFigure3D = ({ visible = true, screenBounds = { left: 80, right: 400 } }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  const [containerX, setContainerX] = useState(150);
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleExpanded, setBubbleExpanded] = useState(false);
  const [bubbleOpacity, setBubbleOpacity] = useState(0);

  const stateRef = useRef({
    position: { x: 150 },
    targetX: 150,

    // Animation state machine
    animState: STATE_IDLE,
    walkDirection: 1, // 1 = right, -1 = left

    // Rotation: 0 = facing user, PI/2 = facing right, -PI/2 = facing left
    bodyRotation: 0,
    targetRotation: 0,

    // Transition progress (0-1)
    transitionProgress: 0,

    // Walk cycle phase
    walkPhase: 0,
    idlePhase: 0,
    wavePhase: 0,

    // Pose blending
    currentPose: { ...IDLE_POSE },

    isHovered: false,
    nextWanderTime: performance.now() + 5000,
    nextBubbleTime: performance.now() + 8000 + Math.random() * 7000,
    bubbleVisible: false,
    chatOpen: false,

    // For stopping animation - remember where in walk cycle we were
    stopWalkPhase: 0,
  });

  useEffect(() => {
    stateRef.current.isHovered = isHovered;
  }, [isHovered]);

  const startWalking = (targetX) => {
    const state = stateRef.current;
    if (state.animState === STATE_WALKING || state.animState === STATE_TURNING_TO_WALK) {
      // Already walking, just update target
      state.targetX = targetX;
      state.walkDirection = targetX > state.position.x ? 1 : -1;
      state.targetRotation = state.walkDirection * Math.PI / 2;
      return;
    }

    state.targetX = targetX;
    state.walkDirection = targetX > state.position.x ? 1 : -1;
    state.targetRotation = state.walkDirection * Math.PI / 2;
    state.animState = STATE_TURNING_TO_WALK;
    state.transitionProgress = 0;
  };

  const stopWalking = () => {
    const state = stateRef.current;

    if (state.animState === STATE_TURNING_TO_WALK) {
      // If still turning, just go back to idle
      state.animState = STATE_TURNING_TO_IDLE;
      state.transitionProgress = 0;
      return;
    }

    if (state.animState !== STATE_WALKING) return;

    state.stopWalkPhase = state.walkPhase;
    state.animState = STATE_STOPPING;
    state.transitionProgress = 0;
  };

  const handleClick = () => {
    const state = stateRef.current;

    // If walking, trigger stop animation
    if (state.animState === STATE_WALKING || state.animState === STATE_TURNING_TO_WALK) {
      stopWalking();
    }

    if (showBubble) {
      setBubbleExpanded(true);
      state.chatOpen = true;
    } else {
      setShowBubble(true);
      setBubbleOpacity(1);
      setBubbleExpanded(true);
      state.bubbleVisible = true;
      state.chatOpen = true;
    }
  };

  const handleCloseBubble = () => {
    setBubbleExpanded(false);
    stateRef.current.chatOpen = false;
    setTimeout(() => {
      setBubbleOpacity(0);
      setTimeout(() => {
        setShowBubble(false);
        stateRef.current.bubbleVisible = false;
        stateRef.current.nextBubbleTime = performance.now() + 15000 + Math.random() * 15000;
      }, 300);
    }, 200);
  };

  // Main draw function
  const draw = useCallback((ctx, canvas, state) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 15;
    const availableHeight = height - padding * 2;
    const scale = availableHeight / FIGURE_HEIGHT;

    const screenCX = width / 2;
    const screenCY = height / 2;

    const { animState, walkPhase, idlePhase, wavePhase, bodyRotation, walkDirection, transitionProgress, isHovered: hovering } = state;

    // Calculate pose based on animation state
    let shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR;
    let bodyBob = 0;

    if (animState === STATE_IDLE) {
      // Idle pose - arms spread like ^
      shoulderL = IDLE_POSE.shoulderL;
      shoulderR = IDLE_POSE.shoulderR;
      elbowL = IDLE_POSE.elbowL;
      elbowR = IDLE_POSE.elbowR;
      hipL = 0;
      hipR = 0;
      kneeL = 0;
      kneeR = 0;
      bodyBob = Math.sin(idlePhase * Math.PI * 2) * 1;

    } else if (animState === STATE_WALKING) {
      // Full walking animation
      const frontHip = interpolate(WALK_CYCLE.frontHip, walkPhase);
      const backHip = interpolate(WALK_CYCLE.backHip, walkPhase);
      const frontKnee = interpolate(WALK_CYCLE.frontKnee, walkPhase);
      const backKnee = interpolate(WALK_CYCLE.backKnee, walkPhase);
      const frontShoulder = interpolate(WALK_CYCLE.frontShoulder, walkPhase);
      const backShoulder = interpolate(WALK_CYCLE.backShoulder, walkPhase);
      const frontElbow = interpolate(WALK_CYCLE.frontElbow, walkPhase);
      const backElbow = interpolate(WALK_CYCLE.backElbow, walkPhase);
      bodyBob = interpolate(WALK_CYCLE.bodyY, walkPhase);

      // Assign based on walk direction
      if (walkDirection > 0) {
        hipR = frontHip; hipL = backHip;
        kneeR = frontKnee; kneeL = backKnee;
        shoulderL = frontShoulder; shoulderR = backShoulder;
        elbowL = frontElbow; elbowR = backElbow;
      } else {
        hipL = frontHip; hipR = backHip;
        kneeL = frontKnee; kneeR = backKnee;
        shoulderR = frontShoulder; shoulderL = backShoulder;
        elbowR = frontElbow; elbowL = backElbow;
      }

    } else if (animState === STATE_TURNING_TO_WALK) {
      // Blend from idle to walk start pose
      const t = easeInOutCubic(transitionProgress);
      const walkStart = {
        frontHip: WALK_CYCLE.frontHip[0],
        backHip: WALK_CYCLE.backHip[0],
        frontKnee: WALK_CYCLE.frontKnee[0],
        backKnee: WALK_CYCLE.backKnee[0],
        frontShoulder: WALK_CYCLE.frontShoulder[0],
        backShoulder: WALK_CYCLE.backShoulder[0],
        frontElbow: WALK_CYCLE.frontElbow[0],
        backElbow: WALK_CYCLE.backElbow[0],
      };

      if (walkDirection > 0) {
        hipR = lerp(0, walkStart.frontHip, t);
        hipL = lerp(0, walkStart.backHip, t);
        kneeR = lerp(0, walkStart.frontKnee, t);
        kneeL = lerp(0, walkStart.backKnee, t);
        shoulderL = lerp(IDLE_POSE.shoulderL, walkStart.frontShoulder, t);
        shoulderR = lerp(IDLE_POSE.shoulderR, walkStart.backShoulder, t);
        elbowL = lerp(IDLE_POSE.elbowL, walkStart.frontElbow, t);
        elbowR = lerp(IDLE_POSE.elbowR, walkStart.backElbow, t);
      } else {
        hipL = lerp(0, walkStart.frontHip, t);
        hipR = lerp(0, walkStart.backHip, t);
        kneeL = lerp(0, walkStart.frontKnee, t);
        kneeR = lerp(0, walkStart.backKnee, t);
        shoulderR = lerp(IDLE_POSE.shoulderR, walkStart.frontShoulder, t);
        shoulderL = lerp(IDLE_POSE.shoulderL, walkStart.backShoulder, t);
        elbowR = lerp(IDLE_POSE.elbowR, walkStart.frontElbow, t);
        elbowL = lerp(IDLE_POSE.elbowL, walkStart.backElbow, t);
      }

    } else if (animState === STATE_STOPPING) {
      // Blend walk cycle to neutral standing (feet together)
      const t = easeInOutCubic(transitionProgress);
      const phase = state.stopWalkPhase;

      const frontHip = interpolate(WALK_CYCLE.frontHip, phase);
      const backHip = interpolate(WALK_CYCLE.backHip, phase);
      const frontKnee = interpolate(WALK_CYCLE.frontKnee, phase);
      const backKnee = interpolate(WALK_CYCLE.backKnee, phase);
      const frontShoulder = interpolate(WALK_CYCLE.frontShoulder, phase);
      const backShoulder = interpolate(WALK_CYCLE.backShoulder, phase);
      const frontElbow = interpolate(WALK_CYCLE.frontElbow, phase);
      const backElbow = interpolate(WALK_CYCLE.backElbow, phase);

      if (walkDirection > 0) {
        hipR = lerp(frontHip, 0, t);
        hipL = lerp(backHip, 0, t);
        kneeR = lerp(frontKnee, 0, t);
        kneeL = lerp(backKnee, 0, t);
        shoulderL = lerp(frontShoulder, 0, t);
        shoulderR = lerp(backShoulder, 0, t);
        elbowL = lerp(frontElbow, 15, t);
        elbowR = lerp(backElbow, 15, t);
      } else {
        hipL = lerp(frontHip, 0, t);
        hipR = lerp(backHip, 0, t);
        kneeL = lerp(frontKnee, 0, t);
        kneeR = lerp(backKnee, 0, t);
        shoulderR = lerp(frontShoulder, 0, t);
        shoulderL = lerp(backShoulder, 0, t);
        elbowR = lerp(frontElbow, 15, t);
        elbowL = lerp(backElbow, 15, t);
      }

    } else if (animState === STATE_TURNING_TO_IDLE) {
      // Blend from side-facing neutral to front-facing idle
      const t = easeInOutCubic(transitionProgress);
      shoulderL = lerp(0, IDLE_POSE.shoulderL, t);
      shoulderR = lerp(0, IDLE_POSE.shoulderR, t);
      elbowL = lerp(15, IDLE_POSE.elbowL, t);
      elbowR = lerp(15, IDLE_POSE.elbowR, t);
      hipL = 0;
      hipR = 0;
      kneeL = 0;
      kneeR = 0;
    }

    // Wave animation overrides right arm (only when idle and chat is closed)
    if (hovering && !state.chatOpen && animState === STATE_IDLE) {
      shoulderR = interpolate(WAVE_ANIM.shoulder, wavePhase);
      elbowR = interpolate(WAVE_ANIM.elbow, wavePhase);
    }

    // Use the smoothly animated body rotation
    const bodyRotY = bodyRotation;

    const groundY = FIGURE_HEIGHT / 2;
    const pelvisY = groundY - BODY.shinLength - BODY.thighLength + bodyBob;
    const shoulderY = pelvisY - BODY.torsoHeight;
    const headY = shoulderY - BODY.headRadius;

    // Shoulder positions - spread out more
    const shoulderSpread = BODY.torsoWidthTop / 2 + 2;
    const shoulderLX = -shoulderSpread;
    const shoulderRX = shoulderSpread;

    // Determine if walking (limbs swing in Z) or idle (limbs swing in X)
    const isWalking = animState === STATE_WALKING || animState === STATE_TURNING_TO_WALK ||
                      animState === STATE_STOPPING || animState === STATE_TURNING_TO_IDLE;

    // Left arm - swing in Z when walking so it's visible from side view
    const sLRot = deg2rad(shoulderL);
    let elbowLX, elbowLY, elbowLZ, wristLX, wristLY, wristLZ;
    if (isWalking) {
      // Swing in Z direction (visible when rotated 90°)
      elbowLX = shoulderLX;
      elbowLY = shoulderY + Math.cos(sLRot) * BODY.upperArmLength;
      elbowLZ = Math.sin(sLRot) * BODY.upperArmLength;
      const eLRot = deg2rad(shoulderL + elbowL);
      wristLX = elbowLX;
      wristLY = elbowLY + Math.cos(eLRot) * BODY.forearmLength;
      wristLZ = elbowLZ + Math.sin(eLRot) * BODY.forearmLength;
    } else {
      // Swing in X direction (visible when facing user) - for ^ pose
      elbowLX = shoulderLX + Math.sin(sLRot) * BODY.upperArmLength;
      elbowLY = shoulderY + Math.cos(sLRot) * BODY.upperArmLength;
      elbowLZ = 0;
      const eLRot = deg2rad(shoulderL + elbowL);
      wristLX = elbowLX + Math.sin(eLRot) * BODY.forearmLength;
      wristLY = elbowLY + Math.cos(eLRot) * BODY.forearmLength;
      wristLZ = 0;
    }

    // Right arm - swing in Z when walking
    const sRRot = deg2rad(shoulderR);
    let elbowRX, elbowRY, elbowRZ, wristRX, wristRY, wristRZ;
    if (isWalking) {
      elbowRX = shoulderRX;
      elbowRY = shoulderY + Math.cos(sRRot) * BODY.upperArmLength;
      elbowRZ = Math.sin(sRRot) * BODY.upperArmLength;
      const eRRot = deg2rad(shoulderR + elbowR);
      wristRX = elbowRX;
      wristRY = elbowRY + Math.cos(eRRot) * BODY.forearmLength;
      wristRZ = elbowRZ + Math.sin(eRRot) * BODY.forearmLength;
    } else {
      elbowRX = shoulderRX - Math.sin(sRRot) * BODY.upperArmLength;
      elbowRY = shoulderY + Math.cos(sRRot) * BODY.upperArmLength;
      elbowRZ = 0;
      const eRRot = deg2rad(shoulderR + elbowR);
      wristRX = elbowRX - Math.sin(eRRot) * BODY.forearmLength;
      wristRY = elbowRY + Math.cos(eRRot) * BODY.forearmLength;
      wristRZ = 0;
    }

    // Hips
    const hipLX = -BODY.torsoWidthBottom / 3;
    const hipRX = BODY.torsoWidthBottom / 3;

    // Left leg - swing in Z when walking (negated for correct forward direction)
    const hLRot = deg2rad(hipL);
    let kneeLX, kneeLY, kneeLZ, ankleLX, ankleLY, ankleLZ;
    if (isWalking) {
      kneeLX = hipLX;
      kneeLY = pelvisY + Math.cos(hLRot) * BODY.thighLength;
      kneeLZ = -Math.sin(hLRot) * BODY.thighLength;
      const kLRot = deg2rad(hipL + kneeL);
      ankleLX = kneeLX;
      ankleLY = kneeLY + Math.cos(kLRot) * BODY.shinLength;
      ankleLZ = kneeLZ - Math.sin(kLRot) * BODY.shinLength;
    } else {
      kneeLX = hipLX + Math.sin(hLRot) * BODY.thighLength;
      kneeLY = pelvisY + Math.cos(hLRot) * BODY.thighLength;
      kneeLZ = 0;
      const kLRot = deg2rad(hipL + kneeL);
      ankleLX = kneeLX + Math.sin(kLRot) * BODY.shinLength;
      ankleLY = kneeLY + Math.cos(kLRot) * BODY.shinLength;
      ankleLZ = 0;
    }

    // Right leg - swing in Z when walking (negated for correct forward direction)
    const hRRot = deg2rad(hipR);
    let kneeRX, kneeRY, kneeRZ, ankleRX, ankleRY, ankleRZ;
    if (isWalking) {
      kneeRX = hipRX;
      kneeRY = pelvisY + Math.cos(hRRot) * BODY.thighLength;
      kneeRZ = -Math.sin(hRRot) * BODY.thighLength;
      const kRRot = deg2rad(hipR + kneeR);
      ankleRX = kneeRX;
      ankleRY = kneeRY + Math.cos(kRRot) * BODY.shinLength;
      ankleRZ = kneeRZ - Math.sin(kRRot) * BODY.shinLength;
    } else {
      kneeRX = hipRX + Math.sin(hRRot) * BODY.thighLength;
      kneeRY = pelvisY + Math.cos(hRRot) * BODY.thighLength;
      kneeRZ = 0;
      const kRRot = deg2rad(hipR + kneeR);
      ankleRX = kneeRX + Math.sin(kRRot) * BODY.shinLength;
      ankleRY = kneeRY + Math.cos(kRRot) * BODY.shinLength;
      ankleRZ = 0;
    }

    const limbR = BODY.limbRadius;
    const { limbLatLines, limbLonLines, headLatLines, headLonLines, torsoLatLines, torsoLonLines } = WIREFRAME;

    // Determine front/back based on rotation
    const facingRight = bodyRotation > 0.1;
    const facingLeft = bodyRotation < -0.1;
    const facingUser = !facingRight && !facingLeft;

    const backOpacity = 0.5;
    const frontOpacity = 0.85;

    // Draw order depends on rotation
    if (facingUser) {
      // Facing user - draw both sides equally
      drawWireframeLimb(ctx, hipLX, pelvisY, 0, kneeLX, kneeLY, kneeLZ, limbR * 1.2, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, kneeLX, kneeLY, kneeLZ, ankleLX, ankleLY, ankleLZ, limbR, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, hipRX, pelvisY, 0, kneeRX, kneeRY, kneeRZ, limbR * 1.2, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, kneeRX, kneeRY, kneeRZ, ankleRX, ankleRY, ankleRZ, limbR, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, shoulderLX, shoulderY, 0, elbowLX, elbowLY, elbowLZ, limbR * 0.9, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, elbowLX, elbowLY, elbowLZ, wristLX, wristLY, wristLZ, limbR * 0.8, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, shoulderRX, shoulderY, 0, elbowRX, elbowRY, elbowRZ, limbR * 0.9, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
      drawWireframeLimb(ctx, elbowRX, elbowRY, elbowRZ, wristRX, wristRY, wristRZ, limbR * 0.8, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, 0.7);
    } else if (facingRight) {
      // Left side is back
      drawWireframeLimb(ctx, hipLX, pelvisY, 0, kneeLX, kneeLY, kneeLZ, limbR * 1.2, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);
      drawWireframeLimb(ctx, kneeLX, kneeLY, kneeLZ, ankleLX, ankleLY, ankleLZ, limbR, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);
      drawWireframeLimb(ctx, shoulderLX, shoulderY, 0, elbowLX, elbowLY, elbowLZ, limbR * 0.9, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);
      drawWireframeLimb(ctx, elbowLX, elbowLY, elbowLZ, wristLX, wristLY, wristLZ, limbR * 0.8, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);

      drawWireframeTorso(ctx, 0, shoulderY, pelvisY, BODY.torsoWidthTop, BODY.torsoWidthBottom, BODY.torsoDepth, torsoLatLines, torsoLonLines, bodyRotY, screenCX, screenCY, scale, 0.8);
      drawWireframeSphere(ctx, 0, headY, 0, BODY.headRadius * 0.85, BODY.headRadius, BODY.headRadius * 0.75, headLatLines, headLonLines, bodyRotY, screenCX, screenCY, scale, 0.85);

      drawWireframeLimb(ctx, hipRX, pelvisY, 0, kneeRX, kneeRY, kneeRZ, limbR * 1.2, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      drawWireframeLimb(ctx, kneeRX, kneeRY, kneeRZ, ankleRX, ankleRY, ankleRZ, limbR, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      drawWireframeLimb(ctx, shoulderRX, shoulderY, 0, elbowRX, elbowRY, elbowRZ, limbR * 0.9, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      drawWireframeLimb(ctx, elbowRX, elbowRY, elbowRZ, wristRX, wristRY, wristRZ, limbR * 0.8, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      return;
    } else {
      // Right side is back
      drawWireframeLimb(ctx, hipRX, pelvisY, 0, kneeRX, kneeRY, kneeRZ, limbR * 1.2, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);
      drawWireframeLimb(ctx, kneeRX, kneeRY, kneeRZ, ankleRX, ankleRY, ankleRZ, limbR, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);
      drawWireframeLimb(ctx, shoulderRX, shoulderY, 0, elbowRX, elbowRY, elbowRZ, limbR * 0.9, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);
      drawWireframeLimb(ctx, elbowRX, elbowRY, elbowRZ, wristRX, wristRY, wristRZ, limbR * 0.8, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, backOpacity);

      drawWireframeTorso(ctx, 0, shoulderY, pelvisY, BODY.torsoWidthTop, BODY.torsoWidthBottom, BODY.torsoDepth, torsoLatLines, torsoLonLines, bodyRotY, screenCX, screenCY, scale, 0.8);
      drawWireframeSphere(ctx, 0, headY, 0, BODY.headRadius * 0.85, BODY.headRadius, BODY.headRadius * 0.75, headLatLines, headLonLines, bodyRotY, screenCX, screenCY, scale, 0.85);

      drawWireframeLimb(ctx, hipLX, pelvisY, 0, kneeLX, kneeLY, kneeLZ, limbR * 1.2, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      drawWireframeLimb(ctx, kneeLX, kneeLY, kneeLZ, ankleLX, ankleLY, ankleLZ, limbR, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      drawWireframeLimb(ctx, shoulderLX, shoulderY, 0, elbowLX, elbowLY, elbowLZ, limbR * 0.9, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      drawWireframeLimb(ctx, elbowLX, elbowLY, elbowLZ, wristLX, wristLY, wristLZ, limbR * 0.8, limbLatLines, limbLonLines, bodyRotY, screenCX, screenCY, scale, frontOpacity);
      return;
    }

    // Draw torso and head for facing user case
    drawWireframeTorso(ctx, 0, shoulderY, pelvisY, BODY.torsoWidthTop, BODY.torsoWidthBottom, BODY.torsoDepth, torsoLatLines, torsoLonLines, bodyRotY, screenCX, screenCY, scale, 0.8);
    drawWireframeSphere(ctx, 0, headY, 0, BODY.headRadius * 0.85, BODY.headRadius, BODY.headRadius * 0.75, headLatLines, headLonLines, bodyRotY, screenCX, screenCY, scale, 0.85);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const state = stateRef.current;
    let lastTime = performance.now();

    const animate = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update phases
      state.idlePhase = (state.idlePhase + dt * 0.4) % 1;

      if (state.isHovered && !state.chatOpen && state.animState === STATE_IDLE) {
        state.wavePhase = (state.wavePhase + dt * 3) % 1;
      } else {
        state.wavePhase = lerp(state.wavePhase, 0, dt * 5);
      }

      // State machine updates
      if (state.animState === STATE_TURNING_TO_WALK) {
        state.transitionProgress += dt / TURN_DURATION;
        state.bodyRotation = lerp(0, state.targetRotation, easeInOutCubic(clamp(state.transitionProgress, 0, 1)));

        if (state.transitionProgress >= 1) {
          state.animState = STATE_WALKING;
          state.transitionProgress = 0;
          state.bodyRotation = state.targetRotation;
        }
      } else if (state.animState === STATE_WALKING) {
        state.walkPhase = (state.walkPhase + dt * 1.8) % 1;

        const speed = 40;
        state.position.x += state.walkDirection * speed * dt;
        setContainerX(Math.round(state.position.x));

        const reached = state.walkDirection > 0
          ? state.position.x >= state.targetX
          : state.position.x <= state.targetX;

        if (reached) {
          state.position.x = state.targetX;
          setContainerX(Math.round(state.position.x));
          state.stopWalkPhase = state.walkPhase;
          state.animState = STATE_STOPPING;
          state.transitionProgress = 0;
        }
      } else if (state.animState === STATE_STOPPING) {
        state.transitionProgress += dt / STOP_SETTLE_DURATION;

        if (state.transitionProgress >= 1) {
          state.animState = STATE_TURNING_TO_IDLE;
          state.transitionProgress = 0;
          state.targetRotation = 0;
        }
      } else if (state.animState === STATE_TURNING_TO_IDLE) {
        // Store starting rotation on first frame of this state
        if (state.transitionProgress === 0) {
          state.turnStartRotation = state.bodyRotation;
        }

        state.transitionProgress += dt / TURN_DURATION;
        const startRot = state.turnStartRotation !== undefined ? state.turnStartRotation : state.walkDirection * Math.PI / 2;
        state.bodyRotation = lerp(startRot, 0, easeInOutCubic(clamp(state.transitionProgress, 0, 1)));

        if (state.transitionProgress >= 1) {
          state.animState = STATE_IDLE;
          state.transitionProgress = 0;
          state.bodyRotation = 0;
          state.turnStartRotation = undefined;
          state.nextWanderTime = currentTime + 8000 + Math.random() * 12000;
        }
      }

      // Start walking randomly when idle
      if (currentTime > state.nextWanderTime && state.animState === STATE_IDLE && !state.isHovered && !state.bubbleVisible) {
        const newTarget = screenBounds.left + Math.random() * (screenBounds.right - screenBounds.left);
        startWalking(newTarget);
      }

      // Show speech bubble occasionally when idle
      if (currentTime > state.nextBubbleTime && state.animState === STATE_IDLE && !state.bubbleVisible) {
        setShowBubble(true);
        setBubbleOpacity(1);
        state.bubbleVisible = true;
        setTimeout(() => {
          if (!bubbleExpanded) {
            setBubbleOpacity(0);
            setTimeout(() => {
              setShowBubble(false);
              state.bubbleVisible = false;
              state.nextBubbleTime = currentTime + 20000 + Math.random() * 20000;
            }, 300);
          }
        }, 8000);
      }

      draw(ctx, canvas, state);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [visible, draw, screenBounds, bubbleExpanded, startWalking]);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [visible]);

  if (!visible) return null;

  const figureHeight = Math.min(window.innerHeight * 0.22, 180);
  const figureWidth = figureHeight * 0.6;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={() => {
        setIsHovered(true);
        stateRef.current.isHovered = true;
        // Show speech bubble on hover (collapsed state)
        if (!showBubble && !stateRef.current.chatOpen) {
          setShowBubble(true);
          setBubbleOpacity(1);
          stateRef.current.bubbleVisible = true;
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        stateRef.current.isHovered = false;
        // Hide speech bubble when not hovering (unless chat is open)
        if (!bubbleExpanded && !stateRef.current.chatOpen) {
          setBubbleOpacity(0);
          setTimeout(() => {
            if (!stateRef.current.isHovered && !stateRef.current.chatOpen) {
              setShowBubble(false);
              stateRef.current.bubbleVisible = false;
            }
          }, 300);
        }
      }}
      style={{
        position: 'fixed',
        left: containerX - figureWidth / 2,
        bottom: 10,
        width: figureWidth,
        height: figureHeight,
        pointerEvents: 'auto',
        zIndex: 1000,
        cursor: 'pointer',
      }}
    >
      <SpeechBubble
        visible={showBubble}
        expanded={bubbleExpanded}
        onClose={handleCloseBubble}
        opacity={bubbleOpacity}
      />
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default StickFigure3D;
