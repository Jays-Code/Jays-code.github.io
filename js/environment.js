import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.loadSkybox();
        // this.createStars(); // Replaced by Starfield.js
        // this.createPlanets(); 
        this.createLights();
    }

    loadSkybox() {
        const loader = new THREE.TextureLoader();
        const path = 'img/skybox/skybox_equi.png';

        const texture = loader.load(path);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        this.scene.background = texture;
        this.scene.backgroundIntensity = 0.8; // Adjusted to user preference
    }

    createLights() {
        // Bright ambient light to ensure textures are visible everywhere
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Strong directional light (Sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(50, 100, 50);
        this.scene.add(sunLight);
    }

    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });

        const starVertices = [];
        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    createPlanets() {
        // Array of planet configurations with distinct colors and positions
        const planetsData = [
            { pos: [50, 0, -100], color: 0xff4400, size: 10, name: 'Mars-like' },
            { pos: [-80, 20, -150], color: 0x00ff88, size: 15, name: 'Earth-like' },
            { pos: [0, -50, -200], color: 0x4400ff, size: 20, name: 'Ice Giant' },
            { pos: [100, 50, 50], color: 0xffcc00, size: 12, name: 'Gas Giant' }
        ];

        planetsData.forEach(data => {
            const geometry = new THREE.SphereGeometry(data.size, 32, 32);
            const material = new THREE.MeshStandardMaterial({
                color: data.color,
                roughness: 0.8,
                metalness: 0.2
            });
            const planet = new THREE.Mesh(geometry, material);
            planet.position.set(...data.pos);
            this.scene.add(planet);
        });
    }
}
