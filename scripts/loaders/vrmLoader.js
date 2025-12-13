import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

let currentVrm = null;

export async function loadVRM(modelUrl, scene) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.register((parser) => {
      return new VRMLoaderPlugin(parser, {
        autoUpdateHumanBones: true,
      });
    });

    loader.load(
      modelUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm;

        if (currentVrm) {
          scene.remove(currentVrm.scene);
          VRMUtils.deepDispose(currentVrm.scene);
        }

        currentVrm = vrm;
        scene.add(vrm.scene);

        resolve(vrm);
      },
      undefined,
      reject
    );
  });
}
