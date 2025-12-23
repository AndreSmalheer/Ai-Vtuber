import { loadMixamoAnimation } from "../../three-vrm-3.4.4/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js";
import * as THREE from "three";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/loaders/FBXLoader.js";

const loader = new FBXLoader();

const loadedActions = [];

export async function loadAnimations(urls, vrm, mixer) {
  for (const url of urls) {
    let clip = null;

    clip = await loadMixamoAnimation(url, vrm);
    const action = mixer.clipAction(clip);

    action.reset();
    action.setLoop(THREE.LoopOnce, 0);
    action.clampWhenFinished = true;

    loadedActions.push(action);
  }

  return { loadedActions };
}
