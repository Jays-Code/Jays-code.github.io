import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class Planet {
    constructor(scene, cssScene, config) {
        this.scene = scene;
        this.cssScene = cssScene;
        this.config = config;


        this.beam = null; // Keep ref
        this.label = null; // New Idle Label
        this.isActive = false;

        // Animation State
        this.animState = {
            beamScale: 0,
            screenScale: 0,
            labelOpacity: 1
        };

        this.init();
    }

    init() {
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

        // Create Group to hold everything
        this.mesh = new THREE.Group();
        this.mesh.position.set(...this.config.pos);
        this.scene.add(this.mesh);

        // Actual Planet Sphere (Rotates)
        this.sphere = new THREE.Mesh(geometry, material);
        this.mesh.add(this.sphere);

        // 2. Create the Landing Pad (Visual Marker)
        const padGeo = new THREE.CylinderGeometry(2, 2, 0.5, 32);
        const padMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const pad = new THREE.Mesh(padGeo, padMat);

        // Position pad on top of the planet relative to local space
        pad.position.set(0, this.config.size, 0);
        this.sphere.add(pad);

        // 3. Create the Projection Beam (Holographic Light)
        const beamHeight = 60; // Sky Beam (Very Tall)
        const beamGeo = new THREE.CylinderGeometry(30, 2, beamHeight, 32, 1, true); // Top wide (30), bottom narrow

        // Custom Shader for Holographic Beam
        const beamVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const beamFragmentShader = `
            uniform float uTime;
            uniform float uOpacity; // Controlled by animation
            varying vec2 vUv;

            void main() {
                // Base Color (Cyan)
                vec3 color = vec3(0.0, 1.0, 1.0);

                // Vertical Fade (Fade out at top/bottom edges slightly, strong at bottom)
                float alpha = 1.0 - vUv.y; 
                alpha = pow(alpha, 1.5); // Non-linear fade

                // Scanline Effect
                float scanline = sin(vUv.y * 200.0 - uTime * 3.0);
                float scanlineEffect = 0.5 + 0.5 * scanline; // 0 to 1
                
                // Combine
                alpha *= (0.3 + 0.7 * scanlineEffect); // Modulate opacity

                gl_FragColor = vec4(color, alpha * uOpacity); 
            }
        `;

        this.beamUniforms = {
            uTime: { value: 0 },
            uOpacity: { value: 0.0 } // Start invisible
        };

        const beamMat = new THREE.ShaderMaterial({
            uniforms: this.beamUniforms,
            vertexShader: beamVertexShader,
            fragmentShader: beamFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.beam = new THREE.Mesh(beamGeo, beamMat);
        // Position beam: halfway up from pad
        this.beam.position.set(0, this.config.size + (beamHeight / 2), 0);
        this.beam.scale.set(1, 0, 1); // Start flat
        this.beam.visible = false;
        this.mesh.add(this.beam);


        // 4. Create the CSS3D Screen (The "Hologram")
        // Create a Container for correct centering
        const container = document.createElement('div');
        container.style.width = '0px';
        container.style.height = '0px';
        // container.style.background = 'rgba(255, 0, 0, 0.2)'; // Debug

        const div = document.createElement('div');
        div.className = 'planet-screen';
        div.style.width = '400px'; // Set actual size here
        div.style.height = '300px';
        div.style.backgroundColor = 'rgba(0, 20, 40, 0.5)';
        div.style.border = '2px solid cyan';
        div.style.boxShadow = '0 0 20px cyan';
        div.style.color = 'white';
        div.style.padding = '20px';
        div.style.fontFamily = 'monospace';
        div.style.boxSizing = 'border-box';

        // Center the content relative to the 0x0 container (Anchor Point)
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        div.style.transform = 'translate(-50%, -50%)';

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

        container.appendChild(div);

        this.screen = new CSS3DObject(container);
        // Position screen at the top of the beam
        this.screen.position.set(0, this.config.size + beamHeight - 10, 0); // Slight overlap
        this.screen.scale.set(0, 0, 0); // Start hidden
        this.screen.visible = false;

        // Tilt down slightly (30 degrees) for "Stadium Screen" feel
        this.screen.rotation.x = Math.PI / 6;

        this.mesh.add(this.screen);

        // 5. Create "Idle Label" (Floating Name Tag)
        this.createLabel();
    }

    createLabel() {
        // Create Canvas Texture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // Style
        ctx.fillStyle = 'rgba(0, 0, 0, 0.0)'; // Transparent bg
        ctx.fillRect(0, 0, 512, 128);

        // Glow / Border effect
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 492, 108);

        // Text
        ctx.font = 'bold 60px monospace';
        ctx.fillStyle = 'cyan';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.name.toUpperCase(), 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8 });
        this.label = new THREE.Sprite(mat);

        // Position floating above pad
        this.label.position.set(0, this.config.size + 15, 0);
        this.label.scale.set(20, 5, 1); // Aspect ratio matching canvas

        this.mesh.add(this.label);
    }

    activate() {
        this.isActive = true;
        this.displayScreen(true);
    }

    deactivate() {
        this.isActive = false;
        this.displayScreen(false);
    }

    displayScreen(show) {
        // Just triggers state logic, animation handled in update
        if (show) {
            this.beam.visible = true;
            this.screen.visible = true; // Make visible immediately so it can scale up
        }
    }

    update(time) {
        // Rotate planet sphere only (Beam and Screen stay static)
        if (this.sphere) this.sphere.rotation.y += 0.001;

        // Update Beam Uniforms
        if (this.beamUniforms && time) {
            this.beamUniforms.uTime.value = time * 0.001; // Scale ms to seconds
        }

        // Animate Label (Bobbing)
        if (this.label) {
            const bob = Math.sin(time * 0.002) * 1.5;
            this.label.position.y = this.config.size + 15 + bob;
        }

        // --- Transition Animation Logic ---
        const dt = 0.05; // Lerp factor

        // Target Values
        const targetBeamScale = this.isActive ? 1.0 : 0.0;
        const targetScreenScale = this.isActive ? 0.15 : 0.0;
        const targetLabelOpacity = this.isActive ? 0.0 : 1.0;
        const targetBeamOpacity = this.isActive ? 0.15 : 0.0; // Max opacity 0.15

        // Lerp Beam Scale (Y grow)
        if (this.beam) {
            this.animState.beamScale += (targetBeamScale - this.animState.beamScale) * dt;
            this.beam.scale.y = this.animState.beamScale;

            // If basically 0, hide
            if (!this.isActive && this.animState.beamScale < 0.01) this.beam.visible = false;
        }

        // Lerp Screen Scale (Uniform grow)
        if (this.screen) {
            this.animState.screenScale += (targetScreenScale - this.animState.screenScale) * dt;
            this.screen.scale.set(this.animState.screenScale, this.animState.screenScale, this.animState.screenScale);

            if (!this.isActive && this.animState.screenScale < 0.001) this.screen.visible = false;
        }

        // Lerp Label Opacity
        if (this.label) {
            this.animState.labelOpacity += (targetLabelOpacity - this.animState.labelOpacity) * dt;
            this.label.material.opacity = this.animState.labelOpacity;
            this.label.visible = this.animState.labelOpacity > 0.01;
        }

        // Lerp Beam Opacity Uniform
        if (this.beamUniforms) {
            // Need a separate lerp for opacity value or reuse beamScale logic?
            // Reusing beamScale logic is fine, but let's be explicit
            const currentOp = this.beamUniforms.uOpacity.value;
            this.beamUniforms.uOpacity.value += (targetBeamOpacity - currentOp) * dt;
        }
    }
}
