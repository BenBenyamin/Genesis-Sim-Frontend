// src/App.js

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER = 'http://127.0.0.1:5001';

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
      transports: ['polling','websocket'],
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
      // console.log('frame received', buf.byteLength, 'bytes');
      if (!firstFrame) {
        firstFrame = true;
        setReady(true);
      }
      // draw it
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

  return (
    <div style={{ textAlign: 'center', margin: '1em' }}>
      {!ready && <p>Loading simulation…</p>}

      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{ border: '1px solid #000', backgroundColor: '#7b7b7b' }}
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
