import * as THREE from 'three';

export class Asteroid {
    constructor(scene, position) {
        this.scene = scene;
        this.mesh = null;
        this.radius = 2 + Math.random() * 2; // Random size 2-4
        this.init(position);

        // Random Drift
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );

        // Random Rotation
        this.rotSpeed = {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02
        };
    }

    init(pos) {
        // Low Poly Rock Look: Dodecahedron with flat shading
        const geometry = new THREE.DodecahedronGeometry(this.radius, 1);

        // Randomize vertices for "rock" look
        const posAttribute = geometry.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const current = new THREE.Vector3().fromBufferAttribute(posAttribute, i);
            current.addScalar((Math.random() - 0.5) * 0.5); // Add noise
            posAttribute.setXYZ(i, current.x, current.y, current.z);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x555555, // Dark grey to avoid bloom glow
            roughness: 0.8,
            metalness: 0.2,
            flatShading: true
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(pos);
        this.scene.add(this.mesh);
    }

    update() {
        if (!this.mesh) return;
        this.mesh.position.add(this.velocity);
        this.mesh.rotation.x += this.rotSpeed.x;
        this.mesh.rotation.y += this.rotSpeed.y;
    }

    getCollider() {
        return {
            center: this.mesh.position,
            radius: this.radius
        };
    }
}
