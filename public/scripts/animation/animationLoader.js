import { loadMixamoAnimation } from "../../three-vrm-3.4.4/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js";
import * as THREE from "three";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/loaders/FBXLoader.js";

const loader = new FBXLoader();

const loadedActions = [];

export async function getFBXBoneNames(fbxUrl) {
  const fbx = await new Promise((resolve, reject) => {
    loader.load(fbxUrl, resolve, null, reject);
  });

  const clip = fbx.animations[0];
  if (!clip) return [];

  const boneNames = clip.tracks
    .map((track) => track.name.split(".")[0])
    .filter((v, i, a) => a.indexOf(v) === i);

  return boneNames;
}

async function loadFBXAnimation(url, vrm) {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      url,
      (fbx) => {
        // Assuming the FBX contains an animation clip
        const clip = fbx.animations[0];
        resolve(clip);
      },
      undefined,
      (error) => reject(error)
    );
  });
}

export async function loadAnimations(urls, vrm, mixer) {
  for (const url of urls) {
    let type = "";
    let bones = await getFBXBoneNames(url);

    let loop = 0;
    let checkBones = [];

    for (const bone of bones) {
      loop++;
      if (loop > 6) {
        break;
      }

      checkBones.push(bone);

      if (bone.includes("mixamor")) {
        type = "Mixamo";
      } else if (bone.includes("J_")) {
        type = "Vroid";
      }
    }

    let clip = null;

    if (type == "Mixamo") {
      clip = await loadMixamoAnimation(url, vrm);
    } else {
      clip = await loadFBXAnimation(url, vrm);
    }

    const action = mixer.clipAction(clip);

    action.reset();
    action.setLoop(THREE.LoopOnce, 0);
    action.clampWhenFinished = true;

    loadedActions.push(action);
  }

  return { loadedActions };
}
