import * as THREE from 'three';

export class Projectile {
    constructor(scene, position, direction, color = 0xff0000) {
        this.scene = scene;
        this.mesh = null;
        this.velocity = direction.clone().normalize().multiplyScalar(1.0); // Speed
        this.life = 100; // Frames/updates to live
        this.isDead = false;

        this.init(position, color);
    }

    init(pos, color) {
        // 1. Bolt Geometry (Cylinder)
        // Radius 0.1, Length 1.5
        const geometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        geometry.rotateX(-Math.PI / 2); // Align with Z axis (forward)

        // 2. Material (Glowing Core)
        // Mix user color with white for a "hot" core look
        const startColor = new THREE.Color(color);
        const coreColor = startColor.clone().lerp(new THREE.Color(0xffffff), 0.5);

        const material = new THREE.MeshBasicMaterial({
            color: coreColor,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(pos);

        // 3. Orient to Velocity
        // Default cylinder points up (Y). We rotated geometry to Z.
        // So we just need to lookAt the direction.

        // Calculate target point (current + velocity interaction)
        // Since velocity is the direction vector, lookAt(pos + velocity) work
        const target = pos.clone().add(this.velocity);
        this.mesh.lookAt(target);

        // 4. Add Glow Light
        const light = new THREE.PointLight(color, 2, 10);
        this.mesh.add(light);

        this.scene.add(this.mesh);
    }

    update() {
        if (this.isDead) return;

        this.mesh.position.add(this.velocity);
        this.life--;

        if (this.life <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.isDead = true;
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            // Optionally dispose geometry/material if managing memory strictly
        }
    }

    getCollider() {
        return {
            center: this.mesh.position,
            radius: 0.3
        };
    }
}
