import * as THREE from "three";
import { lipSyncActive } from "./lipSync.js";
import { configPromise } from "../../config.js";
import { IsOllamaStreaming } from "../../logic/llm.js";

const config = await configPromise;

let animations = [];
let idle_animations = [];
let is_playing = false;
let current_action;
let previous_action;
let specs = [];
let idleAnimations;
let talkingAnimations;
let playing_idle;
let playing_talking = false;
let defaultAction = null;
let lastActiveTime = performance.now();

// config
let animation_fade_in_ms = config.animation_fade_in;
let animation_fade_out_ms = config.animation_fade_out;
let animation_fade_in = animation_fade_in_ms / 1000;
let animation_fade_out = animation_fade_out_ms / 1000;
const idleDelay = config.idleDelay;
const ttsEnabled = false;

const ALL_HUMANOID_BONES = [
  // Root & spine
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",

  // Left arm
  "leftShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",

  // Right arm
  "rightShoulder",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",

  // Left leg
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "leftToes",

  // Right leg
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "rightToes",

  // Left fingers
  "leftThumbMetacarpal",
  "leftThumbProximal",
  "leftThumbDistal",

  "leftIndexProximal",
  "leftIndexIntermediate",
  "leftIndexDistal",

  "leftMiddleProximal",
  "leftMiddleIntermediate",
  "leftMiddleDistal",

  "leftRingProximal",
  "leftRingIntermediate",
  "leftRingDistal",

  "leftLittleProximal",
  "leftLittleIntermediate",
  "leftLittleDistal",

  // Right fingers
  "rightThumbMetacarpal",
  "rightThumbProximal",
  "rightThumbDistal",

  "rightIndexProximal",
  "rightIndexIntermediate",
  "rightIndexDistal",

  "rightMiddleProximal",
  "rightMiddleIntermediate",
  "rightMiddleDistal",

  "rightRingProximal",
  "rightRingIntermediate",
  "rightRingDistal",

  "rightLittleProximal",
  "rightLittleIntermediate",
  "rightLittleDistal",
];

function load_specs() {
  fetch("http://127.0.0.1:5000/api/animations/json", {})
    .then((response) => response.json())
    .then((data) => {
      specs = data;
    })
    .catch((error) => console.error("Error:", error));
}

load_specs();

function buildTracksFromSpec(vrm, spec) {
  const tracks = [];
  let maxTime = 0;

  const getBoneNode = (name) => {
    try {
      return vrm.humanoid.getNormalizedBoneNode(name);
    } catch (e) {
      return null;
    }
  };

  for (const item of spec) {
    const { bone, property, keyframes } = item;
    if (!keyframes || keyframes.length === 0) continue;

    const times = [];
    const values = [];

    if (property === "position") {
      const node = getBoneNode(bone);
      if (!node) continue;
      for (const k of keyframes) {
        times.push(k.time);
        values.push(...k.value); // expect [x,y,z]
        if (k.time > maxTime) maxTime = k.time;
      }
      tracks.push(
        new THREE.VectorKeyframeTrack(node.name + ".position", times, values)
      );
    } else if (property === "quaternion") {
      const node = getBoneNode(bone);
      if (!node) continue;
      for (const k of keyframes) {
        times.push(k.time);
        values.push(...k.value); // expect [x,y,z,w]
        if (k.time > maxTime) maxTime = k.time;
      }
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          node.name + ".quaternion",
          times,
          values
        )
      );
    } else if (property === "rotationEuler") {
      const node = getBoneNode(bone);
      if (!node) continue;
      for (const k of keyframes) {
        times.push(k.time);
        const e = new THREE.Euler(k.value[0], k.value[1], k.value[2]);
        const q = new THREE.Quaternion().setFromEuler(e);
        values.push(...q.toArray());
        if (k.time > maxTime) maxTime = k.time;
      }
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          node.name + ".quaternion",
          times,
          values
        )
      );
    } else if (property === "number" || property === "expression") {
      const timesNum = [];
      const valsNum = [];
      for (const k of keyframes) {
        timesNum.push(k.time);
        valsNum.push(k.value);
        if (k.time > maxTime) maxTime = k.time;
      }
      if (property === "expression") {
        const trackName = vrm.expressionManager.getExpressionTrackName(bone);
        tracks.push(
          new THREE.NumberKeyframeTrack(trackName, timesNum, valsNum)
        );
      } else {
        tracks.push(new THREE.NumberKeyframeTrack(bone, timesNum, valsNum));
      }
    }
  }

  return { tracks, duration: maxTime };
}

export function load_animations_from_spec(
  vrm,
  mixer,
  spec,
  clipName = "SimpleClip",
  type
) {
  if (!vrm || !mixer) return;

  const { tracks, duration } = buildTracksFromSpec(vrm, spec);
  if (tracks.length === 0) return;

  const clip = new THREE.AnimationClip(clipName, duration, tracks);
  const action = mixer.clipAction(clip);
  action.type = type;
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;

  animations.push(action);

  return action;
}

export function updateAnimation(vrm, mixer) {
  if (!vrm) return;

  const lipSyncActiveFlag = ttsEnabled ? lipSyncActive : IsOllamaStreaming;

  // load animations from json
  if (animations.length === 0) {
    for (let i = 0; i < specs.length; i++) {
      const { name, spec, type } = specs[i];
      load_animations_from_spec(vrm, mixer, spec, name, type);
    }

    idleAnimations = animations.filter((action) => action.type === "idle");

    talkingAnimations = animations.filter(
      (action) => action.type === "talking"
    );

    defaultAction = animations.find((a) => a.type === "default");

    if (defaultAction && !current_action) {
      defaultAction.reset();
      defaultAction.enabled = true;
      defaultAction.setLoop(THREE.LoopRepeat);
      defaultAction.play();

      current_action = defaultAction;
      previous_action = null;

      is_playing = true;
      playing_idle = false;
      playing_talking = false;
    }
  }

  function crossFade(fromAction, toAction, fadeDuration) {
    if (!fromAction || !toAction) return;

    toAction.reset();
    toAction.enabled = true;

    if (
      typeof THREE !== "undefined" &&
      typeof toAction.setLoop === "function"
    ) {
      toAction.clampWhenFinished = true;
    }

    fromAction.enabled = true;
    toAction.play();

    if (typeof toAction.crossFadeFrom === "function") {
      toAction.crossFadeFrom(fromAction, fadeDuration, true);
    } else {
      toAction.fadeIn(fadeDuration);
      if (typeof fromAction.fadeOut === "function")
        fromAction.fadeOut(fadeDuration);
    }

    previous_action = fromAction;
    current_action = toAction;
    is_playing = true;
  }

  function play_animation(animation) {
    crossFade(current_action || defaultAction, animation, animation_fade_in);
  }

  if (!mixer.userData) mixer.userData = {};

  if (!mixer.userData.hasAnimFinishListener) {
    mixer.userData.hasAnimFinishListener = true;

    mixer.addEventListener("finished", (e) => {
      const finishedAction = e.action;
      const animation_type = finishedAction.type;

      is_playing = false;

      if (animation_type == "talking") {
        if (lipSyncActiveFlag) {
          const nextAction =
            talkingAnimations[
              Math.floor(Math.random() * talkingAnimations.length)
            ];

          play_animation(nextAction);
        }
      }

      if (animation_type == "idle") {
        if (!lipSyncActiveFlag) {
          lastActiveTime = performance.now();
          if (current_action && current_action === finishedAction) {
            finishedAction.fadeOut(animation_fade_out);
            current_action = defaultAction;
            if (defaultAction) {
              defaultAction.reset();
              defaultAction.enabled = true;
              defaultAction.setLoop(THREE.LoopRepeat);
              defaultAction.play();
            }
          }
          playing_idle = false;
          is_playing = false;
        }
      }
    });
  }

  function idle_anims() {
    const now = performance.now();

    if (
      !lipSyncActiveFlag &&
      (!is_playing || !playing_idle) &&
      now - lastActiveTime > idleDelay
    ) {
      if (current_action && playing_talking)
        current_action.fadeOut(animation_fade_out);
      const nextAction =
        idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
      is_playing = true;
      playing_idle = true;
      playing_talking = false;
      current_action = nextAction;
      play_animation(nextAction);
    } else if (lipSyncActiveFlag && playing_idle) {
      if (current_action) current_action.fadeOut(animation_fade_out);
      is_playing = false;
      playing_idle = false;
    }
  }

  function talking_anims() {
    if (lipSyncActiveFlag && (!is_playing || !playing_talking)) {
      if (current_action && playing_idle)
        current_action.fadeOut(animation_fade_out);

      const nextAction =
        talkingAnimations[Math.floor(Math.random() * talkingAnimations.length)];

      is_playing = true;
      playing_talking = true;
      playing_idle = false;

      current_action = nextAction;
      play_animation(nextAction);
    } else if (!lipSyncActiveFlag && playing_talking) {
      if (current_action) current_action.fadeOut(animation_fade_out);
      is_playing = false;
      playing_talking = false;
    }
  }

  idle_anims();
  talking_anims();

  if (lipSyncActiveFlag) lastActiveTime = performance.now();
}
