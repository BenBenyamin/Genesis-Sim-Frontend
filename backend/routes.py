import eventlet
eventlet.monkey_patch()  # ← must come first

import numpy as np

import threading, os, sys, cv2
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO , emit

# bring sim+wrapper into path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)
from sim.sim import get_sim
from wrapper.wrapper import GenesisSceneVideoStream

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app,
                    cors_allowed_origins="*",
                    async_mode="eventlet")


# precompute your blank JPEG once
_blank = np.zeros((720, 1280, 3), dtype=np.uint8)
_, blank_buf = cv2.imencode('.jpg', _blank)
blank_bytes = blank_buf.tobytes()

# ─── Build the simulation in the background ───────────────────────────────────
simulation_ready = False
wrap = None

def build_sim():
    global wrap, simulation_ready
    scene = get_sim()  # expensive
    wrap = GenesisSceneVideoStream(scene, n_frames=200, fps=40)
    simulation_ready = True
    socketio.emit('ready')

threading.Thread(target=build_sim, daemon=True).start()

# ─── Healthcheck so client knows when to open WS ──────────────────────────────
@app.route('/api/ready')
def ready():
    return jsonify(ready=simulation_ready)

@app.route('/api/hello')
def hello():
    return jsonify(message="Server is alive!")

# ─── Frame emitter ─────────────────────────────────────────────────────────────
def emit_frames():
    # wait until simulation is up
    while not simulation_ready:
        socketio.emit('frame', blank_bytes)
        socketio.sleep(0.1)

    for frame in wrap.get_frame():
        bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        ok, buf = cv2.imencode('.jpg', bgr)
        if not ok:
            continue
        socketio.emit('frame', buf.tobytes())
        socketio.sleep(0.1 / wrap.fps)

@socketio.on('connect')
def on_connect():
    
    if simulation_ready:
        emit('ready')

    print("👤 Client connected; starting stream task.")
    socketio.emit('frame', blank_bytes)
    socketio.start_background_task(emit_frames)


@socketio.on('pause')
def on_pause():
    wrap.paused = True

@socketio.on('resume')
def on_resume():
    wrap.paused = False




# ─── Run server ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    socketio.run(app,
                 host='0.0.0.0',
                 port=5001,
                 debug=False,
                 use_reloader=False)
