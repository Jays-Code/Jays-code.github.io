import * as THREE from 'three';

export class Destinations {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.createDestinations();
    }

    createDestinations() {
        const destinationsData = [
            {
                name: 'Resume',
                url: '#resume', // Placeholder for demo
                pos: [0, 0, -50],
                color: 0x00ff00
            },
            {
                name: 'Projects',
                url: '#projects', // Placeholder
                pos: [-30, 10, -80],
                color: 0xff00ff
            },
            {
                name: 'Contact',
                url: '#contact', // Placeholder
                pos: [30, -10, -80],
                color: 0xffff00
            }
        ];

        destinationsData.forEach(data => {
            // Create a floating 'Crystal' as a portal
            const geometry = new THREE.OctahedronGeometry(2);
            const material = new THREE.MeshStandardMaterial({
                color: data.color,
                emissive: data.color,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...data.pos);
            mesh.userData = { name: data.name, url: data.url };

            // Add a simple spinning animation function to the mesh
            mesh.userData.animate = () => {
                mesh.rotation.y += 0.01;
                mesh.rotation.z += 0.01;
            };

            this.scene.add(mesh);
            this.items.push(mesh);
        });
    }

    checkCollisions(spaceshipPosition) {
        let nearest = null;
        let minDistance = Infinity;

        for (const item of this.items) {
            // Animate idle rotation
            if (item.userData.animate) item.userData.animate();

            const distance = spaceshipPosition.distanceTo(item.position);

            // Collision threshold
            if (distance < 5) {
                return { collided: true, item: item };
            }

            if (distance < minDistance) {
                minDistance = distance;
                nearest = item;
            }
        }

        return { collided: false, nearest: nearest, distance: minDistance };
    }
}
