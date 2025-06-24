// src/App.js

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER = 'http://127.0.0.1:5001';

var mouse_x, mouse_y;

export default function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // gray placeholder
    ctx.fillStyle = '#7b7b7b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // force a brand-new socket connection
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

    socket.on('connect', () => console.log('socket connected:', socket.id));
    socket.on('disconnect', () => console.log('socket disconnected'));
    socket.on('connect_error', (err) => console.error('connect_error', err));

    socket.on('frame', (buf) => {
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

    return () => socket.disconnect();
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
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // account for any CSS scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse_x = Math.round((e.clientX - rect.left) * scaleX);
    mouse_y = Math.round((e.clientY - rect.top) * scaleY);
  };

  const handelWheel = (e) => {

    e.preventDefault();

    console.log('Wheel rotated, deltaY:', e.deltaY);

  };

  const mouseDown = (e) => {

    e.preventDefault();
    console.log('Mouse Button pressed:', e.button);

  };


  return (
    <div style={{ textAlign: 'center', margin: '1em' }}>
      {!ready && <p>Loading simulation…</p>}

      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onMouseMove={handleMouseMove}
        onWheel = {handelWheel}
        onMouseDown = {mouseDown}
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
