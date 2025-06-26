// src/App.js

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
// Font Awesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearchPlus,  // zoom
  faSyncAlt,     // rotate
  faArrowsAlt    // pan
} from '@fortawesome/free-solid-svg-icons';

const SERVER = 'http://127.0.0.1:5001';

export default function App() {
  const canvasRef      = useRef(null);
  const socketRef      = useRef(null);
  const [isPaused,     setIsPaused]     = useState(true);
  const [ready,        setReady]        = useState(false);
  const [showControls, setShowControls] = useState(true);  // visible by default
  const activeButton   = useRef(null);

  // — Socket & Canvas Setup —
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // placeholder until first frame
    ctx.fillStyle = '#7b7b7b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // initialize Socket.IO
    const socket = io(SERVER, {
      transports: ['polling','websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 10,
    });
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    let firstFrame = false;
    socket.on('connect',    () => console.log('socket connected:', socket.id));
    socket.on('disconnect', () => console.log('socket disconnected'));
    socket.on('frame', buf => {
      if (!firstFrame) {
        firstFrame = true;
        setReady(true);
      }
      const blob = new Blob([buf], { type: 'image/jpeg' });
      const img  = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(blob);
    });

    // event handlers
    const handleMouseMove = e => {
      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const x      = Math.round((e.clientX - rect.left) * scaleX);
      const y      = Math.round((e.clientY - rect.top ) * scaleY);
      socket.emit('user_interaction', { x, y, button: activeButton.current });
    };
    const handleWheel = e => {
      e.preventDefault();
      socket.emit('user_interaction', { wheelDelta: e.deltaY });
    };
    const handleMouseDown = e => {
      e.preventDefault();
      activeButton.current = e.button;
    };
    const handleMouseUp = () => {
      activeButton.current = null;
    };
    const blockContextMenu = e => e.preventDefault();

    // attach listeners
    canvas.addEventListener('mousemove',   handleMouseMove);
    canvas.addEventListener('wheel',       handleWheel, { passive: false });
    canvas.addEventListener('mousedown',   handleMouseDown, { passive: false });
    canvas.addEventListener('mouseup',     handleMouseUp);
    canvas.addEventListener('contextmenu', blockContextMenu);

    return () => {
      socket.disconnect();
      canvas.removeEventListener('mousemove',   handleMouseMove);
      canvas.removeEventListener('wheel',       handleWheel);
      canvas.removeEventListener('mousedown',   handleMouseDown);
      canvas.removeEventListener('mouseup',     handleMouseUp);
      canvas.removeEventListener('contextmenu', blockContextMenu);
    };
  }, []);

  // — Control Buttons —
  const togglePause = () => {
    const sock = socketRef.current;
    if (!sock || !sock.connected) return;
    sock.emit(isPaused ? 'resume' : 'pause');
    setIsPaused(!isPaused);
  };
  const handleResetCam = () => {
    const sock = socketRef.current;
    if (sock && sock.connected) sock.emit('reset_cam');
  };

  // — Layout & Styles —
  const containerStyle = {
    display: 'flex',
    height: '100vh',
    fontFamily: 'system-ui, sans-serif'
  };
  const sideWrapStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: showControls ? '15%' : '5%',
    backgroundColor: showControls ? '#F5F5F5' : 'transparent',
    padding: showControls ? '24px' : '8px',
    boxShadow: showControls ? '2px 0 8px rgba(0,0,0,0.1)' : 'none'
  };
  const toggleButtonStyle = {
    backgroundColor: '#1ABC9C',
    border: 'none',
    color: '#fff',
    borderRadius: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: showControls ? '20px' : '0'
  };
  const sidebarStyle = {
    width: '100%'
  };
  const legendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '18px',
    color: '#333'
  };
  const iconStyle = {
    marginRight: '10px',
    fontSize: '22px'
  };
  const mainStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  };
  const canvasStyle = {
    border: '2px solid #333',
    backgroundColor: '#7b7b7b'
  };
  const buttonBarStyle = {
    marginTop: '16px',
    display: 'flex',
    gap: '12px'
  };
  const primaryButton = {
    backgroundColor: '#1ABC9C',
    border: 'none',
    color: '#fff',
    borderRadius: '4px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px'
  };
  const secondaryButton = {
    backgroundColor: '#BDC3C7',
    border: 'none',
    color: '#fff',
    borderRadius: '4px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      {/* Toggle + Sidebar */}
      <div style={sideWrapStyle}>
        {showControls ? (
          <div style={sidebarStyle}>
            <button
              onClick={() => setShowControls(false)}
              style={toggleButtonStyle}
            >
              Hide Controls
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
              Controls
            </h2>
            <div style={legendItemStyle}>
              <FontAwesomeIcon icon={faSearchPlus} style={iconStyle} />
              Mouse wheel — Zoom
            </div>
            <div style={legendItemStyle}>
              <FontAwesomeIcon icon={faSyncAlt} style={iconStyle} />
              Wheel click + drag — Rotate
            </div>
            <div style={legendItemStyle}>
              <FontAwesomeIcon icon={faArrowsAlt} style={iconStyle} />
              Right-click + drag — Pan
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowControls(true)}
            style={toggleButtonStyle}
          >
            Show Controls
          </button>
        )}
      </div>

      {/* Main Content */}
      <main style={mainStyle}>
        {!ready && <p>Loading simulation…</p>}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          style={canvasStyle}
        />
        {ready && (
          <div style={buttonBarStyle}>
            <button onClick={togglePause} style={primaryButton}>
              {isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            </button>
            <button onClick={handleResetCam} style={secondaryButton}>
              Reset Camera
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
