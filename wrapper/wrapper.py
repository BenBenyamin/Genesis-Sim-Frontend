import numpy as np
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

            self.scene.build()
            # self.scene.reset()

            print("Loaded the simulation!", flush=True)
        
        def get_frame(self):
            while True:
                self.scene.reset()
                self.paused = True
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
