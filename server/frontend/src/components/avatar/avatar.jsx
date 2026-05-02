import "./avatar.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

const DEV_CAMERA_CONTROLS = false;

function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

function createScene() {
  return new THREE.Scene();
}

function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    0.1,
    20,
  );

  camera.position.set(0, 1.3, 1.2);

  return camera;
}

function createControls(camera, renderer) {
  if (!DEV_CAMERA_CONTROLS) return null;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.018, 1.309, 0.204);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();
  return controls;
}

function updateThemeVisuals(renderer, scene, isDark) {
  const bgColor = isDark ? 0x111111 : 0xf5f5f5;

  renderer.setClearColor(bgColor, 1);

  const fogDensity = isDark ? 0.035 : 0.015;
  scene.fog = new THREE.FogExp2(bgColor, fogDensity);

  const lights = scene.children.filter((c) => c instanceof THREE.Light);
  lights.forEach((l) => scene.remove(l));

  const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.45 : 0.55);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
  keyLight.position.set(1, 2, 2);
  keyLight.castShadow = true;

  const fillLight = new THREE.DirectionalLight(0x8fb3ff, 0.12);
  fillLight.position.set(-1.5, 1, 1);

  const rimLight = new THREE.DirectionalLight(0xffffff, isDark ? 0.3 : 0.15);
  rimLight.position.set(-0.5, 2, -3);

  const faceLight = new THREE.SpotLight(0xfff2e6, 0.75, 7, Math.PI / 8, 0.7, 1.5);
  faceLight.position.set(0, 1.8, 1.4);
  faceLight.target.position.set(0, 1.5, 0);

  scene.add(
    ambientLight,
    keyLight,
    fillLight,
    rimLight,
    faceLight,
    faceLight.target
  );

  return { keyLight, fillLight, faceLight };
}

function loadVRM(scene, setLoading, onLoaded, modelName = "Mia-clothed.vrm") {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  loader.load(
    `/3d-assests/vrm-models/${modelName}`,
    (gltf) => {
      const vrm = gltf.userData.vrm;
      scene.add(vrm.scene);

      if (vrm.expressionManager) {
        console.log("Available expressions:", vrm.expressionManager.expressions.map(e => e.expressionName));
      }

      onLoaded(vrm);
      setLoading(false);
    },
    undefined,
    (error) => {
      console.error("Error loading VRM:", error);
      setLoading(false);
    }
  );
}

function startAnimation(renderer, scene, camera, controls, composer, getVRM, getLights) {
  let id;
  const clock = new THREE.Clock();

  let blinkTimer = 0;
  let nextBlinkTime = 3 + Math.random() * 4;
  let isBlinking = false;
  const blinkDuration = 0.18;

  const animate = () => {
    id = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    if (DEV_CAMERA_CONTROLS && controls) controls.update();

    const vrm = getVRM();
    if (vrm) {
      blinkTimer += delta;

      if (!isBlinking && blinkTimer >= nextBlinkTime) {
        isBlinking = true;
        blinkTimer = 0;
      }

      if (isBlinking) {
        const blinkProgress = Math.min(blinkTimer / blinkDuration, 1.0);
        const blinkValue = blinkProgress <= 0.5
          ? blinkProgress * 2
          : 1.0 - (blinkProgress - 0.5) * 2;

        if (vrm.expressionManager) {
          vrm.expressionManager.setValue("blink", blinkValue);
          vrm.expressionManager.setValue("blinkLeft", blinkValue);
          vrm.expressionManager.setValue("blinkRight", blinkValue);
        }

        if (blinkTimer >= blinkDuration) {
          isBlinking = false;
          blinkTimer = 0;
          nextBlinkTime = 2 + Math.random() * 6;
          if (vrm.expressionManager) {
            vrm.expressionManager.setValue("blink", 0);
            vrm.expressionManager.setValue("blinkLeft", 0);
            vrm.expressionManager.setValue("blinkRight", 0);
          }
        }
      }

      vrm.update(delta);
    }

    const lights = getLights?.();

    if (lights?.keyLight) {
      lights.keyLight.intensity = 0.5 + Math.sin(time * 0.6) * 0.03;
    }

    if (lights?.faceLight) {
      lights.faceLight.intensity = 0.75 + Math.sin(time * 0.8) * 0.02;
      lights.faceLight.position.x = Math.sin(time * 0.3) * 0.05;
      lights.faceLight.position.y = 1.8 + Math.sin(time * 0.4) * 0.02;
    }

    camera.position.x = 0.032 + Math.sin(time * 0.2) * 0.01;
    camera.position.y = 1.334 + Math.sin(time * 0.15) * 0.008;
    camera.lookAt(0.018, 1.309, 0.204);

    composer.render();
  };

  animate();

  return () => cancelAnimationFrame(id);
}

function handleResize(container, camera, renderer, composer) {
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };

  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}

export default function Avatar() {
  const mountRef = useRef(null);
  const vrmRef = useRef(null);
  const lightsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(document.body.classList.contains("dark"));
  const [avatarModel, setAvatarModel] = useState("Mia-clothed.vrm");

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data.avatar_model) {
          setAvatarModel(data.avatar_model);
        }
      })
      .catch(err => console.error("Error fetching avatar config:", err));
  }, []);

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark"));
    });

    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = createRenderer(container);
    const scene = createScene();
    const camera = createCamera(container);
    const controls = createControls(camera, renderer);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.08,
        0.3,
        0.9
      )
    );

    lightsRef.current = updateThemeVisuals(renderer, scene, isDark);

    loadVRM(scene, setLoading, (vrm) => {
      vrmRef.current = vrm;
    }, avatarModel);

    const stop = startAnimation(
      renderer,
      scene,
      camera,
      controls,
      composer,
      () => vrmRef.current,
      () => lightsRef.current
    );

    const resize = handleResize(container, camera, renderer, composer);

    return () => {
      stop();
      resize();
      if (controls) controls.dispose();
      if (vrmRef.current) scene.remove(vrmRef.current.scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDark, avatarModel]);

  return (
    <div className="three-js-container" ref={mountRef}>
      {loading && <div className="avatar-loader"><div className="avatar-loader__ring" /></div>}
    </div>
  );
}
