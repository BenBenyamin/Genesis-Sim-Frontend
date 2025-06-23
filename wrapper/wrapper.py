from time import sleep
class GenesisSceneVideoStream:

        def __init__(self, genesis_scene, n_frames = 1000 , fps = 30):
            
            self.scene = genesis_scene
            self.n_frames = n_frames
            self.fps = fps

            self.cam = self.scene.add_camera(
                res=(1280, 720),
                pos=(3.5, 1.0, 2.5),
                lookat=(0, 0, 0.5),
                fov=40,
                GUI=False,
            )

            self.scene.build()
            self.scene.reset()
        
        def get_frame(self):
            while True:
                self.scene.reset()
                for _ in range(self.n_frames):
                    ## get frame
                    frame  = self.cam.render()[0]
                    yield frame
                    #step
                    self.scene.step()
