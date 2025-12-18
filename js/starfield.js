import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
uniform float uSpeed;
attribute float size;
varying vec3 vColor;

void main() {
    vColor = vec3(1.0); // White stars
    
    // Position Logic
    vec3 pos = position;
    
    // Move stars towards camera (assuming camera looks down -Z)
    // Actually, in this game, ship moves -Z. 
    // So stars relative to ship move +Z.
    
    // We want infinite scroll.
    // Wrap Z: If z > maxZ, reset to minZ.
    
    float depth = 1000.0;
    float zOffset = uTime * uSpeed * 20.0; // Speed multiplier
    
    pos.z = mod(position.z + zOffset, depth) - (depth * 0.5);
    
    // Warp Stretch
    // If speed is high, stretch position.z or scale gl_PointSize?
    // Stretching geometry is better for "lines".
    // But points are easier.
    // Let's rely on trail or stretch.
    // Simple trick: Scale z based on speed to create lines?
    // No, points don't stretch. We need Lines or specialized shader.
    // For Point system: We can use a trick where we stretch the point size 
    // but that just makes big squares.
    
    // Better approach for "Trails": Use BufferGeometry with gl_Lines?
    // Or just simple fast moving dots for now?
    // User asked for "stars stretch into lines".
    
    // Let's stick to Points for performance, but valid "Warp" usually needs:
    // 1. Motion blur (Post-proc) OR
    // 2. Line segments.
    
    // Let's try to simulate stretch by using Points and uSpeed to scale size, 
    // but that might look blocky.
    
    // ALTERNATIVE: Use simple velocity-based motion. 
    // At high speeds, the brain perceives lines.
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

// To do REAL lines, we need LineSegments.
const warpVertexShader = `
uniform float uTime;
uniform float uSpeed;
attribute float aOffset;
varying float vAlpha;

void main() {
    vec3 pos = position;
    
    // Movement (Wrap Z)
    float depth = 2000.0;
    float moveSpeed = (20.0 + uSpeed * 50.0); // Base drift + warp speed
    float z = mod(position.z + uTime * moveSpeed, depth) - (depth * 0.5);
    pos.z = z;
    
    // Stretch logic
    // We can define lines as pairs of vertices.
    // Should we?
    // Keep it simple: Points for now.
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size scales with speed to simulate blur
    gl_PointSize = (2.0 + uSpeed * 0.5) * (500.0 / -mvPosition.z);
    
    // Fade out if too close or far
    float alpha = smoothstep(0.0, 100.0, abs(z + 500.0)); // Fade in back
    vAlpha = 1.0;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
    // Circle shape
    vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
    float dist = length(uv);
    if (dist > 1.0) discard;
    
    float alpha = (1.0 - dist) * 0.8;
    gl_FragColor = vec4(uColor, alpha);
}
`;

export class Starfield {
    constructor(scene) {
        this.scene = scene;
        this.count = 2000;
        this.uniforms = {
            uTime: { value: 0 },
            uSpeed: { value: 0 },
            uColor: { value: new THREE.Color(0xffffff) }
        };

        this.init();
    }

    init() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const sizes = [];

        // Spread stars in a tunnel/box around 0,0,0
        for (let i = 0; i < this.count; i++) {
            const x = (Math.random() - 0.5) * 1000;
            const y = (Math.random() - 0.5) * 1000;
            const z = (Math.random() - 0.5) * 2000;

            positions.push(x, y, z);
            sizes.push(Math.random());
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.ShaderMaterial({
            vertexShader: warpVertexShader,
            fragmentShader: fragmentShader,
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(geometry, material);
        this.scene.add(this.mesh);
    }

    update(time, speed) {
        this.uniforms.uTime.value = time * 0.001; // Seconds
        // Smoothly interpolate speed uniform to target
        // But main passed speed is presumably the ship's current speed
        this.uniforms.uSpeed.value = speed;
    }
}
