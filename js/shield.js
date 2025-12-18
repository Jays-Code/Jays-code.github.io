import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uImpact;
varying vec2 vUv;
varying vec3 vNormal;

// Hexagon Grid Function (Standard)
float hex(vec2 uv, float scale) {
    vec2 p = uv * scale;
    vec2 r = vec2(1.0, 1.73);
    vec2 h = r * 0.5;
    
    vec2 a = mod(p, r) - h;
    vec2 b = mod(p - h, r) - h;
    
    vec2 g = dot(a, a) < dot(b, b) ? a : b;
    float x = abs(g.x);
    float y = abs(g.y);
    
    return max(x, x * 0.5 + y * 0.866);
}

void main() {
    vec3 color = vec3(0.0, 1.0, 1.0); // Cyan
    
    // 1. Hex Grid
    float h = hex(vUv, 20.0);
    
    // Edges logic
    float gridPattern = smoothstep(0.45, 0.5, h); // Only show edges
    
    // 2. Flicker / Noise (More intense)
    float noise = sin(uTime * 20.0 + vUv.y * 30.0) * 0.5 + 0.5;
    
    // 3. Impact Intensity
    // Mix constant glow with noise
    float intensity = uImpact * (0.6 + 0.5 * noise); 
    
    // 4. Fresnel Rim
    float viewAngle = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float rim = pow(1.0 - viewAngle, 2.0); // Wider rim
    
    vec3 finalColor = color * (gridPattern + rim * 0.8);
    
    // Alpha
    float alpha = (gridPattern * 1.5 + rim) * intensity * 0.5;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

export class Shield {
    constructor(scene, targetObject) {
        this.scene = scene;
        this.target = targetObject; // The object to follow (spaceship mesh)

        this.uniforms = {
            uTime: { value: 0 },
            uImpact: { value: 0 }
        };

        this.init();
    }

    init() {
        // Geometry: Slightly larger than ship radius
        const geometry = new THREE.SphereGeometry(2.5, 32, 32);
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false, // Don't occlude inner ship
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // Attach directly to the target (Spaceship) so it follows automatically
        if (this.target) {
            this.target.add(this.mesh);
        } else {
            this.scene.add(this.mesh);
        }

        this.mesh.visible = false;
    }

    hit() {
        this.uniforms.uImpact.value = 1.0;
        this.mesh.visible = true;
    }

    update(time, dt) {
        if (!this.mesh) return;

        // Update Uniforms
        this.uniforms.uTime.value = time * 0.001;

        // Decay Impact
        if (this.uniforms.uImpact.value > 0.001) {
            this.uniforms.uImpact.value -= dt * 1.5;
        } else {
            this.uniforms.uImpact.value = 0;
            this.mesh.visible = false;
        }
    }
}
