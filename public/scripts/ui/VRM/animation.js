import * as THREE from "three";
import { lipSyncActive } from "./lipSync.js";

let animations = [];
let is_playing = false;
let current_action;
let previous_action;

// config
let animation_fade_in = 0.15;
let animation_fade_out = 0.15;

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
  clipName = "SimpleClip"
) {
  if (!vrm || !mixer) return;

  const { tracks, duration } = buildTracksFromSpec(vrm, spec);
  if (tracks.length === 0) return;

  const clip = new THREE.AnimationClip(clipName, duration, tracks);
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;

  animations.push(action);

  return action;
}

const specs = [
  {
    name: "ani1",
    spec: [
      {
        bone: "head",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.05, 0.08, 0.02] },
          { time: 0.6, value: [0.12, -0.05, -0.03] },
          { time: 1.3, value: [-0.08, 0.15, 0.04] },
          { time: 2.1, value: [0.15, -0.08, -0.02] },
          { time: 2.8, value: [-0.05, 0.12, 0.03] },
          { time: 3.5, value: [0.08, -0.1, -0.04] },
          { time: 4.2, value: [-0.1, 0.05, 0.02] },
          { time: 5.0, value: [0.05, 0.08, 0.02] },
        ],
      },
      {
        bone: "neck",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.03, 0.05, 0.01] },
          { time: 0.7, value: [0.08, -0.04, -0.02] },
          { time: 1.5, value: [-0.06, 0.1, 0.03] },
          { time: 2.3, value: [0.1, -0.06, -0.01] },
          { time: 3.0, value: [-0.04, 0.08, 0.02] },
          { time: 3.8, value: [0.06, -0.07, -0.03] },
          { time: 4.5, value: [-0.07, 0.04, 0.01] },
          { time: 5.0, value: [0.03, 0.05, 0.01] },
        ],
      },
      {
        bone: "upperChest",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.02, 0.03, 0.01] },
          { time: 0.8, value: [0.05, -0.02, -0.01] },
          { time: 1.7, value: [-0.04, 0.06, 0.02] },
          { time: 2.5, value: [0.06, -0.04, -0.01] },
          { time: 3.3, value: [-0.03, 0.05, 0.01] },
          { time: 4.0, value: [0.04, -0.05, -0.02] },
          { time: 4.7, value: [-0.05, 0.03, 0.01] },
          { time: 5.0, value: [0.02, 0.03, 0.01] },
        ],
      },
      {
        bone: "chest",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.01, 0.02, 0.0] },
          { time: 0.9, value: [0.03, -0.01, -0.01] },
          { time: 1.9, value: [-0.02, 0.04, 0.01] },
          { time: 2.8, value: [0.04, -0.03, 0.0] },
          { time: 3.6, value: [-0.02, 0.03, 0.01] },
          { time: 4.3, value: [0.03, -0.03, -0.01] },
          { time: 5.0, value: [0.01, 0.02, 0.0] },
        ],
      },
      {
        bone: "spine",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.01, 0.01, 0.0] },
          { time: 1.0, value: [0.02, -0.01, 0.0] },
          { time: 2.0, value: [-0.01, 0.03, 0.01] },
          { time: 3.0, value: [0.03, -0.02, 0.0] },
          { time: 4.0, value: [-0.01, 0.02, 0.0] },
          { time: 5.0, value: [0.01, 0.01, 0.0] },
        ],
      },
      {
        bone: "leftShoulder",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.02, 0.05, 0.03] },
          { time: 0.6, value: [0.06, -0.03, -0.02] },
          { time: 1.4, value: [-0.04, 0.08, 0.04] },
          { time: 2.2, value: [0.08, -0.05, -0.03] },
          { time: 3.0, value: [-0.03, 0.06, 0.02] },
          { time: 3.7, value: [0.05, -0.06, -0.04] },
          { time: 4.5, value: [-0.06, 0.04, 0.03] },
          { time: 5.0, value: [0.02, 0.05, 0.03] },
        ],
      },
      {
        bone: "rightShoulder",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.03, -0.04, -0.02] },
          { time: 0.7, value: [-0.02, 0.06, 0.03] },
          { time: 1.5, value: [0.07, -0.07, -0.04] },
          { time: 2.3, value: [-0.05, 0.05, 0.02] },
          { time: 3.1, value: [0.06, -0.04, -0.03] },
          { time: 3.9, value: [-0.04, 0.07, 0.04] },
          { time: 4.6, value: [0.04, -0.05, -0.02] },
          { time: 5.0, value: [0.03, -0.04, -0.02] },
        ],
      },
      {
        bone: "leftUpperArm",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0, 0, -1.25] },
          { time: 1.5, value: [0.02, 0.01, -1.15] },
          { time: 3.2, value: [-0.01, -0.02, -1.2] },
          { time: 5.0, value: [0, 0, -1.25] },
        ],
      },
      {
        bone: "rightUpperArm",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0, 0, 1.25] },
          { time: 1.5, value: [0.02, 0.01, 1.15] },
          { time: 3.2, value: [-0.01, -0.02, 1.2] },
          { time: 5.0, value: [0, 0, 1.25] },
        ],
      },

      {
        bone: "leftLowerArm",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.0, 0.05, 0.15] },
          { time: 0.8, value: [0.0, 0.08, 0.22] },
          { time: 1.7, value: [0.0, 0.06, 0.18] },
          { time: 2.6, value: [0.0, 0.1, 0.25] },
          { time: 3.4, value: [0.0, 0.07, 0.2] },
          { time: 4.2, value: [0.0, 0.09, 0.23] },
          { time: 5.0, value: [0.0, 0.05, 0.15] },
        ],
      },
      {
        bone: "rightLowerArm",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.0, -0.06, -0.18] },
          { time: 0.9, value: [0.0, -0.09, -0.24] },
          { time: 1.8, value: [0.0, -0.07, -0.2] },
          { time: 2.7, value: [0.0, -0.1, -0.26] },
          { time: 3.6, value: [0.0, -0.08, -0.22] },
          { time: 4.4, value: [0.0, -0.09, -0.25] },
          { time: 5.0, value: [0.0, -0.06, -0.18] },
        ],
      },
      {
        bone: "leftHand",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.03, 0.02, 0.05] },
          { time: 1.0, value: [0.05, 0.04, 0.08] },
          { time: 2.0, value: [0.04, 0.03, 0.06] },
          { time: 3.0, value: [0.06, 0.05, 0.09] },
          { time: 4.0, value: [0.04, 0.03, 0.07] },
          { time: 5.0, value: [0.03, 0.02, 0.05] },
        ],
      },
      {
        bone: "rightHand",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [-0.02, -0.03, -0.06] },
          { time: 1.1, value: [-0.04, -0.05, -0.09] },
          { time: 2.1, value: [-0.03, -0.04, -0.07] },
          { time: 3.1, value: [-0.05, -0.06, -0.1] },
          { time: 4.1, value: [-0.03, -0.04, -0.08] },
          { time: 5.0, value: [-0.02, -0.03, -0.06] },
        ],
      },
      {
        bone: "leftIndexProximal",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.0, 0.0, 0.04] },
          { time: 1.2, value: [0.0, 0.0, 0.07] },
          { time: 2.5, value: [0.0, 0.0, 0.05] },
          { time: 3.7, value: [0.0, 0.0, 0.08] },
          { time: 5.0, value: [0.0, 0.0, 0.04] },
        ],
      },
      {
        bone: "rightIndexProximal",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.0, 0.0, -0.05] },
          { time: 1.3, value: [0.0, 0.0, -0.08] },
          { time: 2.6, value: [0.0, 0.0, -0.06] },
          { time: 3.8, value: [0.0, 0.0, -0.09] },
          { time: 5.0, value: [0.0, 0.0, -0.05] },
        ],
      },
      {
        bone: "blink",
        property: "expression",
        keyframes: [
          { time: 0, value: 0 },
          { time: 1.2, value: 0 },
          { time: 1.3, value: 1 },
          { time: 1.4, value: 0 },
          { time: 3.5, value: 0 },
          { time: 3.6, value: 1 },
          { time: 3.7, value: 0 },
          { time: 5.0, value: 0 },
        ],
      },
    ],
  },
  {
    name: "ani2",
    spec: [
      {
        bone: "head",
        property: "rotationEuler",
        keyframes: [
          { time: 0, value: [0.05, 0.08, 0.02] },
          { time: 0.6, value: [0.12, -0.05, -0.03] },
          { time: 1.3, value: [-0.08, 0.15, 0.04] },
          { time: 2.1, value: [0.15, -0.08, -0.02] },
          { time: 2.8, value: [-0.05, 0.12, 0.03] },
          { time: 3.5, value: [0.08, -0.1, -0.04] },
          { time: 4.2, value: [-0.1, 0.05, 0.02] },
          { time: 5.0, value: [0.05, 0.08, 0.02] },
        ],
      },
    ],
  },
];

export function updateAnimation(vrm, mixer) {
  if (!vrm) return;

  if (animations.length === 0) {
    for (let i = 0; i < specs.length; i++) {
      const { name, spec } = specs[i];
      load_animations_from_spec(vrm, mixer, spec, name);
    }
  }

  if (!current_action && animations.length > 0) {
    current_action = animations[Math.floor(Math.random() * animations.length)];
  }

  if (!mixer.userData) mixer.userData = {};

  function crossFade(fromAction, toAction, fadeDuration, isOneShot = false) {
    if (!fromAction || !toAction) return;

    toAction.reset();
    toAction.enabled = true;
    toAction.userData = toAction.userData || {};
    toAction.userData.oneShot = !!isOneShot;

    if (
      typeof THREE !== "undefined" &&
      typeof toAction.setLoop === "function"
    ) {
      if (isOneShot) {
        toAction.setLoop(THREE.LoopOnce, 1);
        toAction.clampWhenFinished = true;
      } else {
        toAction.setLoop(THREE.LoopRepeat, Infinity);
        toAction.clampWhenFinished = false;
      }
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
    is_playing = !!isOneShot;
  }

  function playRandomOneShot() {
    if (animations.length === 0) return;

    let next = animations[Math.floor(Math.random() * animations.length)];
    if (animations.length > 1) {
      let attempts = 0;
      while (next === current_action && attempts < 6) {
        next = animations[Math.floor(Math.random() * animations.length)];
        attempts++;
      }
    }

    if (next === current_action) {
      next.reset();
      next.userData = next.userData || {};
      next.userData.oneShot = true;
      if (typeof THREE !== "undefined" && typeof next.setLoop === "function") {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      }
      next.play();
      is_playing = true;
      return;
    }

    const fromAction = current_action || animations[0] || null;
    crossFade(fromAction, next, animation_fade_in, true);
  }

  if (!mixer.userData.hasFinishListener) {
    mixer.userData.hasFinishListener = true;

    mixer.addEventListener("finished", (e) => {
      const finishedAction = e.action;
      if (!finishedAction) return;

      if (finishedAction.userData && finishedAction.userData.oneShot) {
        finishedAction.userData.oneShot = false;
        is_playing = false;

        if (lipSyncActive) {
          playRandomOneShot();
        } else {
          const idle =
            typeof idle_action !== "undefined" && idle_action
              ? idle_action
              : animations[0] || null;

          if (idle && idle !== finishedAction) {
            if (
              typeof THREE !== "undefined" &&
              typeof idle.setLoop === "function"
            ) {
              idle.setLoop(THREE.LoopRepeat, Infinity);
              idle.clampWhenFinished = false;
            }

            idle.reset();
            idle.enabled = true;
            idle.play();

            if (typeof finishedAction.crossFadeTo === "function") {
              finishedAction.crossFadeTo(idle, animation_fade_out, true);
            } else {
              idle.fadeIn(animation_fade_out);
              if (typeof finishedAction.fadeOut === "function")
                finishedAction.fadeOut(animation_fade_out);
            }

            current_action = idle;
          }
        }
        return;
      }
    });
  }

  function idle() {
    if (lipSyncActive && !is_playing) {
      playRandomOneShot();
    } else if (!lipSyncActive && is_playing) {
      const fallbackIdle =
        typeof idle_action !== "undefined" && idle_action
          ? idle_action
          : animations[0] || null;

      if (fallbackIdle && current_action && current_action !== fallbackIdle) {
        if (typeof current_action.crossFadeTo === "function") {
          current_action.crossFadeTo(fallbackIdle, animation_fade_out, true);
        } else {
          fallbackIdle.reset();
          fallbackIdle.play();
          fallbackIdle.fadeIn(animation_fade_out);
          if (typeof current_action.fadeOut === "function")
            current_action.fadeOut(animation_fade_out);
        }

        current_action = fallbackIdle;
      } else if (
        current_action &&
        typeof current_action.fadeOut === "function"
      ) {
        current_action.fadeOut(animation_fade_out);
      }

      is_playing = false;
    }
  }

  idle();
}
