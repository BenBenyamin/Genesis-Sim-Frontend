// src/App.js

import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER = 'http://127.0.0.1:5001';

export default function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Draw a gray placeholder immediately
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Handler to draw incoming frames
    const handleFrame = (arrayBuffer) => {
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(blob);
    };

    // Connect to the Socket.IO server immediately
    const socket = io(SERVER, {
      transports: ['polling', 'websocket'],  // fallback → WS upgrade
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('🔄 Connection error, retrying…', err.message);
    });

    socket.on('frame', handleFrame);

    socket.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{
          border: '1px solid #000',
          backgroundColor: '#7b7b7b',  // matches the gray placeholder
        }}
      />
    </div>
  );
}
