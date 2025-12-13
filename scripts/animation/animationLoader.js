import { loadMixamoAnimation } from "../../three-vrm-3.4.4/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js";
import * as THREE from "three";

const loadedActions = [];

export async function loadAnimations(urls, vrm, mixer) {
  for (const url of urls) {
    const clip = await loadMixamoAnimation(url, vrm);
    const action = mixer.clipAction(clip);

    action.reset();
    action.setLoop(THREE.LoopOnce, 0);
    action.clampWhenFinished = true;

    loadedActions.push(action);
  }

  return { loadedActions };
}
