import argparse

import numpy as np

import genesis as gs



def get_sim():
    parser = argparse.ArgumentParser()
    parser.add_argument("-v", "--vis", action="store_true", default=False)
    parser.add_argument("-c", "--cpu", action="store_true", default=False)
    args = parser.parse_args()

    ########################## init ##########################
    gs.init(backend=gs.cpu if args.cpu else gs.gpu, logging_level="debug")

    ########################## create a scene ##########################

    scene = gs.Scene(
        sim_options=gs.options.SimOptions(
            substeps=10,
            gravity=(0, 0, -9.8),
        ),
        viewer_options=gs.options.ViewerOptions(
            camera_pos=(2, 2, 1.5),
            camera_lookat=(0, 0, 0.5),
            camera_up=(0, 0, 1),
        ),
        show_viewer=args.vis,
    )

    ########################## materials ##########################
    mat_elastic = gs.materials.PBD.Elastic()

    ########################## entities ##########################

    bunny = scene.add_entity(
        gs.morphs.MJCF(file="xml/franka_emika_panda/panda.xml")
    )
    
    ########################## build ##########################

    return scene

