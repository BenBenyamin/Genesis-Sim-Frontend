// src/App.js

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER = 'http://127.0.0.1:5001';

export default function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true);
  const [ready, setReady] = useState(false);
  const activeButton = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Gray placeholder
    ctx.fillStyle = '#7b7b7b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initialize Socket.IO
    const socket = io(SERVER, {
      transports: ['polling', 'websocket'],
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
    socket.on('connect_error', err => console.error('connect_error', err));
    socket.on('frame', buf => {
      if (!firstFrame) {
        firstFrame = true;
        setReady(true);
      }
      const blob = new Blob([buf], { type: 'image/jpeg' });
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(blob);
    });

    // Handlers
    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      console.log('Mouse position:', x, y , activeButton.current);
      socket.emit('user_interaction', { x, y ,button:activeButton.current});
      
    };

    const handleWheel = e => {
      e.preventDefault();
      console.log('Wheel rotated, deltaY:', e.deltaY);
      socket.emit('user_interaction', { wheelDelta: e.deltaY });
    };

    const handleMouseDown = e => {
      e.preventDefault();
      activeButton.current = e.button;
      console.log('Mouse button pressed:', e.button);
      
    };

    const handleContextMenu = e => {
      e.preventDefault();
    };

    const handleMouseUp = () => {
      activeButton.current = null;
    };

    // Attach listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      socket.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const togglePause = () => {
    const sock = socketRef.current;
    if (!sock || !sock.connected) return;
    if (isPaused) {
      sock.emit('resume');
      setIsPaused(false);
    } else {
      sock.emit('pause');
      setIsPaused(true);
    }
  };

  return (
    <div style={{ textAlign: 'center', margin: '1em' }}>
      {!ready && <p>Loading simulation…</p>}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{
          touchAction: 'none',
          overscrollBehavior: 'contain',
          border: '1px solid #000',
          backgroundColor: '#7b7b7b'
        }}
      />
      <br />
      {ready && (
        <button onClick={togglePause} style={{ padding: '8px 16px' }}>
          {isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        </button>
      )}
    </div>
  );
}
