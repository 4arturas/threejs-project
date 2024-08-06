import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import './style.css'

const CANVAS_ID = 'scene'

let canvas: HTMLElement
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let ambientLight: THREE.AmbientLight
let pointLight: THREE.PointLight
let cube: THREE.Mesh
let camera: THREE.PerspectiveCamera
let cameraControls: OrbitControls
canvas = document.querySelector(`canvas#${CANVAS_ID}`)!

function init() {
    // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
    {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
        renderer.shadowMap.enabled = true
        scene = new THREE.Scene()
    }

    // ===== 💡 LIGHTS =====
    {
        ambientLight = new THREE.AmbientLight('white', 0.4)
        scene.add(ambientLight)

        pointLight = new THREE.PointLight('white', 20, 100)
        pointLight.position.set(-2, 2, 2)
        pointLight.castShadow = true
        scene.add(pointLight)
    }

    // ===== 📦 OBJECTS =====
    {
        const sideLength = 1
        const cubeGeometry = new THREE.BoxGeometry(sideLength, sideLength, sideLength)
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: '#f69f1f'})
        cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
        cube.castShadow = true
        cube.position.y = 0.5

        scene.add(cube)
    }

    // ===== 🎥 CAMERA =====
    {
        camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
        camera.position.set(2, 2, 5)
    }

    // ===== 🕹️ CONTROLS =====
    {
        cameraControls = new OrbitControls(camera, canvas)
        cameraControls.target = cube.position.clone()
        cameraControls.enableDamping = true
        cameraControls.autoRotate = false
        cameraControls.update()
    }

    // ===== 🪄 HELPERS =====
    {
        const gridHelper = new THREE.GridHelper(20, 20, 'teal', 'darkgray')
        gridHelper.position.y = -0.01
        scene.add(gridHelper)
    }

}

function animate() {
    requestAnimationFrame(animate)


    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    cameraControls.update()

    renderer.render(scene, camera)
}

init()
animate()
