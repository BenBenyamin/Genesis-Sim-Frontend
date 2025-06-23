import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER = 'http://127.0.0.1:5001';

export default function App() {
  const canvasRef = useRef();
  const socketRef = useRef();
  const [ready, setReady] = useState(false);

  // 1) Poll /api/ready until the backend is ready
  useEffect(() => {
    let timer;
    const checkReady = async () => {
      try {
        const res = await fetch(`${SERVER}/api/ready`);
        const { ready } = await res.json();
        if (ready) setReady(true);
        else timer = setTimeout(checkReady, 500);
      } catch {
        timer = setTimeout(checkReady, 500);
      }
    };
    checkReady();
    return () => clearTimeout(timer);
  }, []);

  // 2) Once ready, open Socket.IO (allows polling → websocket upgrade)
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    socketRef.current = io(SERVER, {
      transports: ['polling', 'websocket'], // ← allow fallback
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current.binaryType = 'arraybuffer';

    socketRef.current.on('connect', () => {
      console.log('🟢 Socket connected:', socketRef.current.id);
    });

    socketRef.current.on('frame', (arrayBuffer) => {
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(blob);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [ready]);

  return (
    <div style={{ textAlign: 'center' }}>
      {!ready && <p>Loading simulation…</p>}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{ border: '1px solid #000' }}
      />
    </div>
  );
}
