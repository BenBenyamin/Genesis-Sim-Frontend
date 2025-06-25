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

mouse_x = mouse_y = 0
prev_x= prev_y = 0
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


@socketio.on('user_interaction')
def handle_interaction(data):

    if (wrap.paused): return

    global mouse_x, mouse_y ,prev_x,prev_y
    mouse_x = data.get("x",mouse_x)
    mouse_y = data.get("y",mouse_y)
    mouse_wheel = data.get('wheelDelta', 0)
    mouse_button = data.get('button')

    print(f"{mouse_x,mouse_y}, button : {mouse_button} , wheel: {mouse_wheel}",flush=True)
    
    ## zoom
    if (mouse_wheel):

        wheel_dir = 1 if mouse_wheel > 0 else -1 
        wrap.zoom_camera(mouse_x,mouse_y,amount=0.1*wheel_dir)
        return
    
    #rotate
    if (mouse_button):  # When button is pressed
        if (prev_x is not None and prev_y is not None):  # Check if we have previous coordinates
            d_vect = np.array([mouse_x - prev_x, mouse_y - prev_y])
            d_norm = np.linalg.norm(d_vect)
            if d_norm >= 10:
                rot_dir = 100.0* d_vect / d_norm
                wrap.rotate_camera(angle_x=rot_dir[1],angle_y=rot_dir[0] ,degrees=True)
        
        # Update previous coordinates regardless of movement
        prev_x = mouse_x
        prev_y = mouse_y
    else:
        # Reset previous coordinates when button is not pressed
        prev_x = None
        prev_y = None



# ─── Run server ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    socketio.run(app,
                 host='0.0.0.0',
                 port=5001,
                 debug=False,
                 use_reloader=False)
