import { loadMixamoAnimation } from "../../three-vrm-3.4.4/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js";
import * as THREE from "three";

export async function setIdlePose(vrm, mixer, idleFbx) {
  if (!vrm || !mixer) return;

  const clip = await loadMixamoAnimation(idleFbx, vrm);
  if (!clip) return;

  const action = mixer.clipAction(clip);

  action.paused = true;
  action.time = 0;
  action.play();
  mixer.update(0);

  const canvas = document.querySelectorAll(".canvas-wrap");

  for (const element of canvas) {
    element.classList.remove("hidden");
  }
}
