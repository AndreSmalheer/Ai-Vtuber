import "./avatar.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const DEV_CAMERA_CONTROLS = false;

function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    container.appendChild(renderer.domElement);
    return renderer;
}

function createScene() {
    return new THREE.Scene();
}

function createCamera(container) {
    const camera = new THREE.PerspectiveCamera(
        30,
        container.clientWidth / container.clientHeight,
        0.1,
        20
    );
    camera.position.set(0, 1.4, 3);
    camera.lookAt(0, 1.0, 0);
    return camera;
}

function createControls(camera, renderer) {
    if (!DEV_CAMERA_CONTROLS) return null;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();
    return controls;
}

function setupLighting(scene) {
    const isDark = localStorage.getItem("theme") === "dark";

    let ambientLight, keyLight, fillLight, rimLight, faceSpot;

    if (isDark) {
        ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
        keyLight = new THREE.PointLight(0xffd4a8, 1.6, 6);
        keyLight.position.set(0.6, 2.0, 1.4);
        keyLight.decay = 2;
        fillLight = new THREE.PointLight(0xa8c4ff, 0.35, 5);
        fillLight.position.set(-1.0, 1.4, 1.0);
        fillLight.decay = 2;
        rimLight = new THREE.DirectionalLight(0x6699cc, 0.45);
        rimLight.position.set(-1.2, 1.8, -2.0);
        faceSpot = new THREE.SpotLight(0xffe8d0, 0.9, 5, Math.PI / 7, 0.7, 2);
        faceSpot.position.set(0.2, 2.4, 1.8);
        faceSpot.target.position.set(0, 1.55, 0);
        scene.add(ambientLight, keyLight, fillLight, rimLight, faceSpot, faceSpot.target);
    } else {
        ambientLight = new THREE.AmbientLight(0xfff5e8, 0.75);
        keyLight = new THREE.DirectionalLight(0xfff2e0, 0.85);
        keyLight.position.set(0.8, 2.2, 2.0);
        fillLight = new THREE.PointLight(0xe8f0ff, 0.5, 7);
        fillLight.position.set(-1.2, 1.6, 1.2);
        fillLight.decay = 2;
        rimLight = new THREE.DirectionalLight(0xffffff, 0.18);
        rimLight.position.set(-1.0, 1.0, -1.5);
        faceSpot = new THREE.SpotLight(0xfff8f0, 0.55, 6, Math.PI / 6, 0.85, 2);
        faceSpot.position.set(0.1, 2.5, 2.0);
        faceSpot.target.position.set(0, 1.55, 0);
        scene.add(ambientLight, keyLight, fillLight, rimLight, faceSpot, faceSpot.target);
    }
}

function loadVRM(scene, setLoading) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let vrm = null;

    loader.load(
        "/3d-assests/vrm-models/Mia-base.vrm",
        (gltf) => {
            vrm = gltf.userData.vrm;
            scene.add(vrm.scene);
            setLoading(false);
        },
        (progress) => {
            console.log("Loading VRM:", ((progress.loaded / progress.total) * 100).toFixed(1) + "%");
        },
        (error) => {
            console.error("Failed to load VRM:", error);
            setLoading(false);
        }
    );

    return () => vrm;
}

function startAnimation(renderer, scene, camera, controls) {
    let animFrameId;

    const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        if (DEV_CAMERA_CONTROLS && controls) controls.update();
        renderer.render(scene, camera);
    };

    animate();

    return () => cancelAnimationFrame(animFrameId);
}

function handleResize(container, camera, renderer) {
    const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
}

function Avatar({ inputLocked }) {
    const mountRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const renderer = createRenderer(container);
        const scene = createScene();
        const camera = createCamera(container);
        const controls = createControls(camera, renderer);

        setupLighting(scene);

        const getVRM = loadVRM(scene, setLoading);
        const stopAnimation = startAnimation(renderer, scene, camera, controls);
        const removeResize = handleResize(container, camera, renderer);

        return () => {
            stopAnimation();
            removeResize();
            if (controls) controls.dispose();

            const vrm = getVRM();
            if (vrm) scene.remove(vrm.scene);

            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div className="three-js-container" ref={mountRef}>
            {loading && (
                <div className="avatar-loader">
                    <div className="avatar-loader__ring" />
                </div>
            )}
        </div>
    );
}

export default Avatar;
