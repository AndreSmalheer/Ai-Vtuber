import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

const VRM_MODEL_DIR = "/3d-assests/vrm-models/";

function getModelUrl(modelName) {
  if (!modelName || typeof modelName !== "string") {
    throw new Error("No VRM model selected.");
  }

  const filename = modelName.split(/[\\/]/).pop();
  if (!filename?.toLowerCase().endsWith(".vrm")) {
    throw new Error(`Invalid VRM model filename: ${modelName}`);
  }

  return `${VRM_MODEL_DIR}${encodeURIComponent(filename)}`;
}

export async function loadVRM(scene, modelName, signal) {
  const url = getModelUrl(modelName);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Could not load ${modelName}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(`Could not load ${modelName}: server returned HTML instead of a VRM file.`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 4) {
    throw new Error(`Could not load ${modelName}: file is empty or invalid.`);
  }

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buffer, VRM_MODEL_DIR, resolve, reject);
  });

  const vrm = gltf.userData.vrm;
  if (!vrm?.scene) {
    throw new Error(`${modelName} loaded, but no VRM data was found.`);
  }

  scene.add(vrm.scene);
  return vrm;
}

export function disposeVRM(scene, vrm) {
  if (!vrm) return;

  if (vrm.scene) {
    scene?.remove(vrm.scene);
    vrm.scene.traverse((object) => {
      object.geometry?.dispose?.();

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.filter(Boolean).forEach((material) => material.dispose?.());
    });
  }

  vrm.dispose?.();
}
