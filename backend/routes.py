import eventlet                                            # ── NEW
eventlet.monkey_patch()                                   # ── NEW

import os
import sys
import cv2

from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

# bring your sim and wrapper into path
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, parent_dir)

from sim.sim import get_sim
from wrapper.wrapper import GenesisSceneVideoStream

# ─── App & SocketIO init ──────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",        # ── ENSURES eventlet WSGI + WebSocket, no threads
)

# ─── Genesis + Wrapper ─────────────────────────────────────────────────────────
scene = get_sim()
wrap = GenesisSceneVideoStream(
    genesis_scene=scene,
    n_frames=200,
    fps=30,
)

# ─── Simple HTTP route ─────────────────────────────────────────────────────────
@app.route('/api/hello')
def hello():
    return jsonify(message='Hello from Python!')

# ─── Frame emitter ─────────────────────────────────────────────────────────────
def emit_frames():
    """Background greenthread: grab frames and emit them."""
    for frame in wrap.get_frame():
        bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        success, buf = cv2.imencode('.jpg', bgr)
        if not success:
            continue
        socketio.emit('frame', buf.tobytes())
        socketio.sleep(1.0 / wrap.fps)

@socketio.on('connect')
def on_connect():
    # starts the greenthread on client connect
    socketio.start_background_task(emit_frames)

# ─── Start server ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # eventlet’s single-process WSGI+WebSocket server, no Python threads
    socketio.run(
        app,
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=False           # ── avoid double-spawn in dev
    )
