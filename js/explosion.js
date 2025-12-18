import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
uniform float uDuration;
attribute vec3 velocity;
attribute float size;
varying float vAlpha;

void main() {
    float progress = uTime / uDuration; // 0.0 to 1.0
    
    // Physics: Move along velocity vector
    vec3 newPos = position + velocity * uTime * 20.0;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    // Size attenuation
    // Grow slightly then shrink
    float scale = 1.0 - pow(progress - 0.2, 2.0); // Curve
    gl_PointSize = size * scale * (300.0 / -mvPosition.z);
    
    // Fade out
    vAlpha = 1.0 - smoothstep(0.5, 1.0, progress); // Fade last half
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
    // Soft Particle Texture (procedural circle)
    vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
    float dist = length(uv);
    if (dist > 1.0) discard;
    
    // Gradient
    float strength = 1.0 - dist;
    strength = pow(strength, 2.0); // Sharp falloff
    
    gl_FragColor = vec4(uColor, vAlpha * strength);
}
`;

export class Explosion {
    constructor(scene, position, color = 0xffaa00) {
        this.scene = scene;
        this.isDead = false;
        this.duration = 1.0; // Seconds
        this.elapsed = 0;

        this.init(position, new THREE.Color(color));
    }

    init(position, color) {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const sizes = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y, position.z);

            // Random sphere velocity
            const v = new THREE.Vector3(
                (Math.random() - 0.5),
                (Math.random() - 0.5),
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(Math.random() * 2.0 + 0.5);

            velocities.push(v.x, v.y, v.z);

            sizes.push(Math.random() * 5.0 + 2.0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        this.uniforms = {
            uTime: { value: 0 },
            uDuration: { value: this.duration },
            uColor: { value: color }
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(geometry, material);
        // Frustum culling can be tricky with expanding shaders, but points usually OK.
        // If they disappear at edge, disable culling.
        this.mesh.frustumCulled = false;

        this.scene.add(this.mesh);
    }

    update(dt) {
        this.elapsed += dt;
        this.uniforms.uTime.value = this.elapsed;

        if (this.elapsed >= this.duration) {
            this.isDead = true;
            this.destroy();
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}
