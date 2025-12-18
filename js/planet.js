import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class Planet {
    constructor(scene, cssScene, config) {
        this.scene = scene;
        this.cssScene = cssScene;
        this.config = config;

        this.mesh = null;
        this.screen = null;
        this.landingPos = new THREE.Vector3();

        this.init();
    }

    init() {
        // 1. Create the Planet Mesh
        // 1. Create the Planet Mesh
        const geometry = new THREE.SphereGeometry(this.config.size, 64, 64);

        const matParams = {
            roughness: 0.8,
            metalness: 0.2
        };

        if (this.config.texture) {
            const loader = new THREE.TextureLoader();
            matParams.map = loader.load(this.config.texture);
            matParams.color = 0xffffff; // White so texture shows true colors
        } else {
            matParams.color = this.config.color;
        }

        const material = new THREE.MeshStandardMaterial(matParams);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(...this.config.pos);
        this.scene.add(this.mesh);

        // 2. Create the Landing Pad (Visual Marker)
        const padGeo = new THREE.CylinderGeometry(2, 2, 0.5, 32);
        const padMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const pad = new THREE.Mesh(padGeo, padMat);

        // Position pad on top of the planet relative to local space
        pad.position.set(0, this.config.size, 0);
        this.mesh.add(pad);

        // Calculate world position for landing (approximate, refined later)
        // We'll use this for the gravity pull target

        // 3. Create the CSS3D Screen (The "Hologram")
        const div = document.createElement('div');
        div.className = 'planet-screen';
        div.style.width = '400px';
        div.style.height = '300px';
        div.style.backgroundColor = 'rgba(0, 20, 40, 0.8)';
        div.style.border = '2px solid cyan';
        div.style.boxShadow = '0 0 20px cyan';
        div.style.color = 'white';
        div.style.padding = '20px';
        div.style.fontFamily = 'monospace';
        div.innerHTML = this.config.content;

        // Add an "Exit" button to the DOM element
        const exitBtn = document.createElement('button');
        exitBtn.innerText = 'LAUNCH / EXIT';
        exitBtn.style.marginTop = '20px';
        exitBtn.style.padding = '10px 20px';
        exitBtn.style.background = 'cyan';
        exitBtn.style.border = 'none';
        exitBtn.style.cursor = 'pointer';
        exitBtn.style.fontWeight = 'bold';
        exitBtn.addEventListener('click', () => {
            if (this.onExit) this.onExit();
        });
        div.appendChild(exitBtn);

        this.screen = new CSS3DObject(div);
        this.screen.position.set(0, this.config.size + 3, 0); // Float above pad
        this.screen.scale.set(0.05, 0.05, 0.05); // Scale down to match Three.js units
        this.mesh.add(this.screen);
    }

    update() {
        // Rotate planet slowly
        this.mesh.rotation.y += 0.001;

        // Ensure the screen always faces roughly towards the landing path or stays fixed relative to planet
        // Actually, if it's child of mesh, it rotates WITH planet. 
        // We might want it to rotate with planet, which is fine.
    }
}
