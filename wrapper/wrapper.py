import numpy as np
from scipy.spatial.transform import Rotation as R


class GenesisSceneVideoStream:

        def __init__(self, genesis_scene, n_frames = 1000 , fps = 30):
            
            self.scene = genesis_scene
            self.n_frames = n_frames
            self.fps = fps
            self.paused = True

            self.cam = self.scene._visualizer._cameras[-1]
            res = self.cam.res
            self.pos = self.cam.pos
            self.lookat = self.cam.lookat

            self._last_frame = np.zeros((res[0], res[1], 3), dtype=np.uint8)

            self.scene.build()
            # self.scene.reset()

            print("Loaded the simulation!", flush=True)
        
        def reset_cam(self):

            self.cam.set_pose(
                pos = self.pos,
                lookat = self.lookat,
            )

        def get_frame(self):
            while True:
                self.scene.reset()
                self.reset_cam()
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


        def rotate_camera(self, angle_x=0, angle_y=0, degrees=False):
            # Convert to radians if needed
            if degrees:
                angle_x = np.radians(angle_x)
                angle_y = np.radians(angle_y)
            
            # Get current vectors
            pos = np.array(self.cam.pos)
            target = np.array(self.cam.lookat)
            up = np.array(self.cam.up)
            
            # Calculate radius (distance from target)
            radius = np.linalg.norm(pos - target)
            
            #Calculate spherical coordinates
            direction = (pos - target) / radius
            theta = np.arccos(direction[1])  # Polar angle (from Y)
            phi = np.arctan2(direction[2], direction[0])  # Azimuthal angle
            
            # Apply new angles (invert some for intuitive controls)
            theta = np.clip(theta - angle_x, 0.1, np.pi-0.1)  # Prevent flipping
            phi -= angle_y
            
            #Calculate new position
            new_pos = np.array([
                radius * np.sin(theta) * np.cos(phi),
                radius * np.cos(theta),
                radius * np.sin(theta) * np.sin(phi)
            ]) + target
            
            #Update camera (automatically handles lookat/up)
            self.cam.set_pose(
                pos=new_pos.tolist(),
                lookat=target.tolist(),
                up=up.tolist()  # Or calculate new up if needed
            )
            

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



