import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { resizeRendererToDisplaySize } from './helpers/responsiveness';
import './style.css';

// Constants
const CANVAS_ID = 'scene';
const PI_TWO = Math.PI * 2;
const PI_HALF = Math.PI / 2;
const DRAW_SPEED = 0.5;

// Variables
let canvas: HTMLCanvasElement;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let cameraControls: OrbitControls;
let ambientLight: THREE.AmbientLight;
let pointLight: THREE.PointLight;
let pointGeometry: THREE.BufferGeometry;
let pointMaterial: THREE.PointsMaterial;
let pointsMesh: THREE.Points;
let currentRadius = 2; // Initial radius
let time = 0;
let accumulatedTime = 0;
let path: Array<THREE.Vector3> = [];
let fourierX: Array<DFT> = [];
let fourierY: Array<DFT> = [];
let circleX: Array<number> = [];
let circleY: Array<number> = [];

// Types
type DFT = { real: number, imag: number, freq: number, amp: number, phase: number };

// Initialize the canvas, renderer, and scene
function initializeScene() {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`) as HTMLCanvasElement;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    scene = new THREE.Scene();
}

// Initialize lights
function initializeLights() {
    ambientLight = new THREE.AmbientLight('white', 0.4);
    scene.add(ambientLight);

    pointLight = new THREE.PointLight('white', 20, 100);
    pointLight.position.set(-2, 2, 2);
    pointLight.castShadow = true;
    scene.add(pointLight);
}

// Initialize camera and controls
function initializeCameraAndControls() {
    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1, 15);

    cameraControls = new OrbitControls(camera, canvas);
    cameraControls.enableDamping = true;
    cameraControls.autoRotate = false;
    cameraControls.update();
}

// Initialize helpers like grid and points
function initializeHelpers() {
    const gridHelperXY = new THREE.GridHelper(20, 20, 'teal', 'darkgray');
    gridHelperXY.rotation.x = Math.PI / 2;
    scene.add(gridHelperXY);

    pointGeometry = new THREE.BufferGeometry();
    pointMaterial = new THREE.PointsMaterial({ color: 'red', size: 0.1 });
    pointsMesh = new THREE.Points(pointGeometry, pointMaterial);
    pointsMesh.name = 'pathPoints';
    scene.add(pointsMesh);
}

// Calculate Discrete Fourier Transform (DFT)
function calculateDFT(signal: Array<number>): Array<DFT> {
    const N = signal.length;
    const X = new Array<DFT>(N);
    for (let k = 0; k < N; k++) {
        let real = 0;
        let imag = 0;
        for (let n = 0; n < N; n++) {
            const phi = (PI_TWO * k * n) / N;
            real += signal[n] * Math.cos(phi);
            imag -= signal[n] * Math.sin(phi);
        }
        real /= N;
        imag /= N;
        X[k] = {
            real,
            imag,
            freq: k,
            amp: Math.sqrt(real * real + imag * imag),
            phase: Math.atan2(imag, real)
        };
    }
    return X;
}

// Create a circle path and its Fourier Transform
function createCirclePath(radius: number) {
    circleX = [];
    circleY = [];
    for (let i = 0; i < PI_TWO; i += PI_TWO / 50) {
        circleX.push(radius * Math.cos(i));
        circleY.push(radius * Math.sin(i));
    }
    fourierX = calculateDFT(circleX);
    fourierY = calculateDFT(circleY);
}

// Get circle points for a given radius
function getCirclePoints(radius: number): Array<THREE.Vector3> {
    createCirclePath(radius);
    return circleX.map((x, i) => new THREE.Vector3(x, circleY[i], 0));
}

// Update the dynamic circle in the scene
function updateDynamicCircle(radius: number) {
    const points = getCirclePoints(radius);
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circleMaterial = new THREE.LineBasicMaterial({ color: "green" });

    const existingCircle = scene.getObjectByName('dynamicCircle');
    if (existingCircle) {
        scene.remove(existingCircle);
    }

    const circleMesh = new THREE.Line(circleGeometry, circleMaterial);
    circleMesh.name = 'dynamicCircle';
    scene.add(circleMesh);
}

// Draw a circle
function drawCircle(centerX: number, centerY: number, radius: number, name: string, color = "red") {
    const curve = new THREE.EllipseCurve(centerX, centerY, radius, radius, 0, PI_TWO, false, 0);
    const points = curve.getPoints(50);
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circleMaterial = new THREE.LineBasicMaterial({ color });
    const circle = new THREE.Line(circleGeometry, circleMaterial);

    const existingCircle = scene.getObjectByName(name);
    if (existingCircle) {
        scene.remove(existingCircle);
    }

    circle.name = name;
    scene.add(circle);
}

// Draw a line
function drawLine(x0: number, y0: number, x1: number, y1: number, name: string, color = "white") {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x0, y0, 0),
        new THREE.Vector3(x1, y1, 0),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(lineGeometry, lineMaterial);

    const existingLine = scene.getObjectByName(name);
    if (existingLine) {
        scene.remove(existingLine);
    }

    line.name = name;
    scene.add(line);
}

// Calculate epicycles and draw them
function calculateEpicycles(x: number, y: number, rotation: number, fourier: Array<DFT>, name: string) {
    fourier.forEach((f, i) => {
        const px = x;
        const py = y;
        const freq = f.freq;
        const radius = f.amp;
        const phase = f.phase + rotation;
        x += radius * Math.cos(freq * time + phase);
        y += radius * Math.sin(freq * time + phase);

        drawCircle(px, py, radius, `${name}circle${i}`, "white");
        drawLine(px, py, x, y, `${name}line${i}`, "white");
    });
    return { x, y };
}

// Update points on the path
function updatePathPoints() {
    const vertices = path.flatMap(pt => [pt.x, pt.y, 0]);
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pointGeometry.attributes.position.needsUpdate = true;
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    accumulatedTime += DRAW_SPEED;

    if (accumulatedTime >= 1) {
        accumulatedTime = 0;

        const px = calculateEpicycles(0, 5, 0, fourierX, "epicyclesX");
        const py = calculateEpicycles(5, 0, PI_HALF, fourierY, "epicyclesY");
        const p = new THREE.Vector3(px.x, py.y, 0);
        path.push(p);

        drawLine(px.x, px.y, p.x, p.y, "drawLineX");
        drawLine(py.x, py.y, p.x, p.y, "drawLineY");

        updatePathPoints();

        const dt = PI_TWO / fourierY.length;
        time += dt;
        if (time > PI_TWO) {
            time = 0;
            path = [];
        }
    }

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    cameraControls.update();
    renderer.render(scene, camera);
}

// Initialize and start the scene
function init() {
    initializeScene();
    initializeLights();
    initializeCameraAndControls();
    initializeHelpers();
    createCirclePath(currentRadius);
    updateDynamicCircle(currentRadius);
    animate();
}

init();
