import numpy as np
from scipy.spatial.transform import Rotation as R


class GenesisSceneVideoStream:

        def __init__(self, genesis_scene, n_frames = 1000 , fps = 30):
            
            self.scene = genesis_scene
            self.n_frames = n_frames
            self.fps = fps
            self.paused = True
            self._last_frame = np.zeros((720, 1280, 3), dtype=np.uint8)

            self.cam = self.scene.add_camera(
                res=(1280, 720),
                pos=(3.5, 1.0, 2.5),
                lookat=(0, 0, 0.5),
                fov=40,
                GUI=False,
            )

            self.pos = np.array((3.5, 0.0, 2.5))
            self.lookat = np.array((0.0, 0.0, 0.5))

            self.scene.build()
            # self.scene.reset()

            print("Loaded the simulation!", flush=True)
        
        def get_frame(self):
            while True:
                self.scene.reset()
                # self.paused = True
                i =0
                while (i < self.n_frames):
                    if self.paused:
                        yield self._last_frame
                        continue

                    ## get frame
                    frame  = self.cam.render()[0]
                    self._last_frame = np.copy(frame)
                    yield frame
                    #step
                    self.scene.step()
                    i+=1


        def rotate_camera(self, angle_x=0, angle_y=0, angle_z=0, degrees=False):
            # Build rotation matrix in camera local frame
            rot = R.from_euler('xyz', (angle_x, angle_y, angle_z), degrees=degrees).as_matrix()

            # Fetch camera vectors
            pos = np.array(self.cam.pos)
            lookat = np.array(self.cam.lookat)
            up = np.array(self.cam.up)

            # Compute camera frame basis
            forward = lookat - pos
            forward /= np.linalg.norm(forward)
            right = np.cross(forward, up)
            right /= np.linalg.norm(right)
            up = np.cross(right, forward)  # re-orthogonalize

            # Form camera rotation matrix (columns = right, up, -forward)
            cam_frame = np.column_stack((right, up, -forward))

            # Apply rotation in local camera frame
            rotated_frame = cam_frame @ rot.T  # rotate camera axes

            # Update camera orientation
            new_forward = -rotated_frame[:, 2]
            new_up = rotated_frame[:, 1]
            new_lookat = pos + new_forward
            # Set camera pose
            self.cam.set_pose(pos=pos.tolist(),
                            lookat=new_lookat.tolist(),
                            up=new_up.tolist())
        

        def pan_camera(self, dx=0, dy=0):

            # Get current camera vectors
            pos = np.array(self.cam.pos)
            lookat = np.array(self.cam.lookat)
            up = np.array(self.cam.up)

            # Compute forward and right vectors
            forward = lookat - pos
            forward /= np.linalg.norm(forward)

            right = np.cross(forward, up)
            right /= np.linalg.norm(right)

            up = np.cross(right, forward)  # re-orthogonalize and normalize
            up /= np.linalg.norm(up)

            # Compute translation in camera plane
            delta = dx * right + dy * up

            # Apply translation
            new_pos = pos + delta
            new_lookat = lookat + delta

            self.cam.set_pose(
                pos=new_pos.tolist(),
                lookat=new_lookat.tolist(),
                up=up.tolist()
            )
        
        def zoom_camera(self, x, y, amount=0.1):

            # Intrinsic parameters
            K  = self.cam.intrinsics
            fx = K[0, 0]
            fy = K[1, 1]
            cx = K[0, 2]
            cy = K[1, 2]

            # Ray direction in camera space
            px = x
            py = y
            cam_dir = np.array([(px - cx) / fx,
                                (py - cy) / fy,
                                1.0])
            cam_dir /= np.linalg.norm(cam_dir)

            # Current camera pose
            pos     = np.array(self.cam.pos)
            lookat  = np.array(self.cam.lookat)
            up      = np.array(self.cam.up)

            # Build camera basis vectors
            forward = lookat - pos
            forward /= np.linalg.norm(forward)
            right   = np.cross(forward, up)
            right   /= np.linalg.norm(right)
            up       = np.cross(right, forward)

            # Rotate camera‐space ray into world space
            cam_rot   = np.column_stack((right, up, forward))
            world_dir = cam_rot @ cam_dir

            # Compute translation delta
            delta      = world_dir * amount
            new_pos    = pos + delta
            new_lookat = lookat + delta

            # Apply new pose
            self.cam.set_pose(
                pos=new_pos.tolist(),
                lookat=new_lookat.tolist(),
                up=up.tolist()
            )



