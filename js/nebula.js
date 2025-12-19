import * as THREE from 'three';

export class NebulaField {
    constructor(scene, count = 30) {
        this.scene = scene;
        this.count = count;
        this.clouds = [];
        this.group = new THREE.Group();

        this.scene.add(this.group);
        this.init();
    }

    init() {
        // Generate a few variations of cloud textures
        const textures = [
            this.createCloudTexture(0x8800ff), // Purple
            this.createCloudTexture(0x00aaff), // Cyan
            this.createCloudTexture(0x4400cc), // Deep Blue
            this.createCloudTexture(0xff00aa)  // Magenta hue
        ];

        const geometry = new THREE.PlaneGeometry(1, 1); // Not used for sprites, but standard

        for (let i = 0; i < this.count; i++) {
            // Randomly select a texture
            const tex = textures[Math.floor(Math.random() * textures.length)];
            const material = new THREE.SpriteMaterial({
                map: tex,
                transparent: true,
                opacity: 0.05 + Math.random() * 0.1, // Much fainter (0.05 to 0.15)
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            const sprite = new THREE.Sprite(material);

            // Random Position in a distant shell (Radius 1200 - 2000)
            // Stars are roughly within 1000 radius, so this puts clouds behind them
            const r = 1200 + Math.random() * 800;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() * Math.PI) - (Math.PI / 2);

            // Convert spherical to cartesian
            // Flatten slightly on Y axis for a "disk/galaxy" feel or keep spherical?
            // Let's keep it somewhat spherical but wider on XZ
            const x = r * Math.cos(phi) * Math.cos(theta);
            const y = (r * 0.6) * Math.sin(phi); // Squashed Y
            const z = r * Math.cos(phi) * Math.sin(theta);

            sprite.position.set(x, y, z);

            // Random Scale (Massive to be seen from distance)
            const scale = 400 + Math.random() * 400; // 400 to 800
            sprite.scale.set(scale, scale, 1);

            // Random Rotation
            sprite.material.rotation = Math.random() * Math.PI * 2;

            this.group.add(sprite);
            this.clouds.push({
                mesh: sprite,
                rotSpeed: (Math.random() - 0.5) * 0.0002 // Slower rotation
            });
        }
    }

    createCloudTexture(baseColorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Extract RGB
        const col = new THREE.Color(baseColorHex);
        const r = Math.floor(col.r * 255);
        const g = Math.floor(col.g * 255);
        const b = Math.floor(col.b * 255);

        // Radial Gradient
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`); // Center opaque-ish
        grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.5)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`); // Edges transparent

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        // Add some noise/puffs
        for (let i = 0; i < 5; i++) {
            const cx = 32 + Math.random() * 64;
            const cy = 32 + Math.random() * 64;
            const cr = 20 + Math.random() * 30;

            const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
            g2.addColorStop(0, `rgba(255, 255, 255, 0.1)`);
            g2.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    update(time) {
        // Slowly rotate global group
        this.group.rotation.y = time * 0.00005;

        // Pulse or rotate individual clouds
        this.clouds.forEach(c => {
            c.mesh.material.rotation += c.rotSpeed;
        });
    }
}
