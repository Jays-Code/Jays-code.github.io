import * as THREE from 'three';

export class UFO {
    constructor(scene, startPos, shipToChase) {
        this.scene = scene;
        this.target = shipToChase;
        this.mesh = null;
        this.projectiles = []; // Shared or local? Ideally scene manager handles projectiles, but UFO can manage its own for simplicity.
        // Actually, main loop needs to check collisions for projectiles.
        // Let's expose fire callback.

        this.onFire = null; // Callback (pos, dir)

        this.lastFireTime = 0;
        this.fireRate = 8000; // ms (reduced from 2000)

        this.fireRate = 8000; // ms (reduced from 2000)

        // Visuals
        this.light = null;
        this.glowMaterials = [];

        this.init(startPos);

    }

    init(pos) {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(pos);

        // Saucer Dome
        const domeGeo = new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        this.mesh.add(dome);

        // Saucer Rim/Base
        const rimGeo = new THREE.CylinderGeometry(3, 3, 0.5, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.5 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.y = -0.25;
        this.mesh.add(rim);

        // Lights
        const lightGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        for (let i = 0; i < 8; i++) {
            const light = new THREE.Mesh(lightGeo, lightMat);
            const angle = (i / 8) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 2.8, -0.25, Math.sin(angle) * 2.8);
            this.mesh.add(light);
            this.glowMaterials.push(lightMat); // Track material
        }

        // Add PointLight for area glow
        this.light = new THREE.PointLight(0x00ff00, 1, 20);
        this.light.position.set(0, -2, 0);
        this.mesh.add(this.light);

        this.scene.add(this.mesh);
    }

    update(time) {
        if (!this.mesh || !this.target || !this.target.mesh) return;

        // 1. Chase Logic: Move towards player but keep distance
        const dist = this.mesh.position.distanceTo(this.target.mesh.position);
        const dirToPlayer = this.target.mesh.position.clone().sub(this.mesh.position).normalize();

        const idealDist = 40;

        if (dist > idealDist) {
            this.mesh.position.add(dirToPlayer.multiplyScalar(0.2));
        } else if (dist < idealDist - 5) {
            this.mesh.position.sub(dirToPlayer.multiplyScalar(0.1)); // Back off
        }

        // Bobbing
        this.mesh.position.y += Math.sin(time * 0.002) * 0.05;
        this.mesh.rotation.y += 0.05; // Spin

        // Pulsing Glow (5 seconds cycle = 5000ms)
        // Normalize time to 0-1 cycle
        const cycle = (time % 5000) / 5000;
        // Sine wave 0 to 1 to 0
        const pulse = (Math.sin(cycle * Math.PI * 2) * 0.5) + 0.5;

        if (this.light) {
            this.light.intensity = 1 + (pulse * 2); // 1 to 3
        }

        // Pulse the green lights themselves (if we want them to flash)
        // Basic material doesn't have emissive intensity, just color. 
        // We can modulate opacity or color, but standard is better.
        // Let's swap to Standard or just keep it simple with the PointLight doing the work.
        // Actually, let's make the lights Standard with Emissive for better look?
        // For now, just the PointLight is enough to cast glow on ship/environment.


        // 2. Fire Logic
        if (time - this.lastFireTime > this.fireRate) {
            if (dist < 100) { // Only fire if close
                this.fire(dirToPlayer);
                this.lastFireTime = time;
            }
        }
    }

    fire(dir) {
        if (this.onFire) {
            const startPos = this.mesh.position.clone().add(new THREE.Vector3(0, -1, 0));
            this.onFire(startPos, dir);
        }
    }
}
