import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Adjust this URL if your backend is hosted elsewhere
const SOCKET_SERVER_URL = 'http://localhost:5001';

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Connect to Flask-SocketIO server
    socketRef.current = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    // Tell socket to expect binary data
    socketRef.current.binaryType = 'arraybuffer';

    socketRef.current.on('connect', () => {
      console.log('Connected to video stream server');
    });

    socketRef.current.on('frame', (arrayBuffer) => {
      // Convert raw bytes into an image blob
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        // Draw the frame into the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Clean up
        URL.revokeObjectURL(url);
      };

      img.src = url;
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from video stream server');
    });

    return () => {
      // Cleanup on unmount
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{ border: '1px solid #000' }}
      />
    </div>
  );
}

export default App;
