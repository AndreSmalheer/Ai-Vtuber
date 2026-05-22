# Avatar Component

The avatar feature is split into a small React layer and one Three.js runtime:

- `avatar.jsx` owns React state, loading, cleanup, and WebGL fallback UI.
- `hooks/avatarState.js` defines app-level avatar statuses.
- `hooks/useAvatarStateMachine.js` controls app-level status transitions.
- `three/avatarRuntime.js` owns the Three.js scene, VRM loading, animation loop, camera controls, lighting, facial motion, blinking, and lip sync.

## Add A New Status

1. Add the status name in `hooks/avatarState.js`.

```js
export const AvatarState = {
  IDLE: "idle",
  LOADING: "loading",
  ACTIVE: "active",
  DISPOSING: "disposing",
  CELEBRATING: "celebrating",
};
```

2. Decide where the status is entered in `avatar.jsx` or `useAvatarStateMachine.js`.

Use `setState(AvatarState.YOUR_STATUS)` when app behavior should change. For example, set a temporary status after a message is sent, when audio starts, or when a model finishes loading.

3. Connect the status to Three.js motion in `three/avatarRuntime.js`.

The runtime has its own `CharacterState` values near the top of `avatarRuntime.js`. Add a matching state there only if the 3D model needs different body, face, or expression behavior.

```js
const CharacterState = {
  UNLOADED: "unloaded",
  LOADING: "loading",
  IDLE: "idle",
  TALKING: "talking",
  CELEBRATING: "celebrating",
};
```

Then update `AvatarCharacter.updateState()` or `runStateAnimation()` so the new state reaches the right animation method.

## Manage Avatar Content

VRM models are loaded from:

```txt
server/frontend/public/3d-assests/vrm-models/
```

To add a model:

1. Put the `.vrm` file in that folder.
2. Pass the filename to the `avatarModel` prop, for example `avatarModel="mia.vrm"`.
3. Keep the filename ending in `.vrm`; paths are stripped for safety, so only the file name is used.

Lip sync content is passed through the `lipSyncState` prop. When it includes an `analyser`, `frequencyData`, and `timeDomainData`, the avatar uses real audio data. When those are missing but `isPlaying` is true, it uses a fallback mouth motion so talking still animates.

## Window Visibility

`useAvatarStateMachine.js` watches `document.visibilitychange`.

When the user switches away from the window or tab:

1. The state changes to `AvatarState.DISPOSING`.
2. `avatar.jsx` disposes the loaded VRM from the Three.js scene.
3. The animation loop stops because the avatar is no longer active/visible.

When the user comes back, `visibilityReloadKey` changes and `avatar.jsx` reloads the current `avatarModel`. This saves GPU/VRM resources while the app is in the background without losing the selected character.

## Where To Change Motion

Most motion tuning is now in `three/avatarRuntime.js`:

- `updateFaceMotion()` controls gaze, smiles, head movement, shoulders, expressions, and speaking energy.
- `updateLipSync()` controls mouth shapes.
- `updateBlink()` controls blink timing.
- `updateBodyPose()` controls arm/body idle motion.
- `updateThemeVisuals()` and `updateLights()` control lighting and dark/light mode visuals.
- `startAnimation()` controls the animation loop and camera return behavior.

Keep new avatar behavior in this file unless it becomes large enough to justify a new module again.

## WebGL Fallback

If the browser or device cannot create a WebGL context, `avatar.jsx` catches the error and shows an inline unavailable message instead of crashing the React tree. The unrelated `Transparent Zen` console errors come from a browser extension script, not from this avatar code.
