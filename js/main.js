import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Spaceship } from './spaceship.js';
import { Environment } from './environment.js';
import { Planet } from './planet.js';
import { Starfield } from './starfield.js';

import { Asteroid } from './asteroid.js';

import { UFO } from './ufo.js';
import { Projectile } from './projectile.js';
import { Explosion } from './explosion.js';
import { UI } from './ui.js';
import { TouchControls } from './touch-controls.js'; // [NEW]

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';


// Scene Setup
const scene = new THREE.Scene();

// Loading Screen Logic
setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('fade-out');
        // Optional: Remove from DOM after transition
        // setTimeout(() => loader.remove(), 1000); 
    }
}, 4500); // 4000ms delay + 500ms safety

// scene.fog = new THREE.FogExp2(0x000000, 0.002); // Fog obscures skybox

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(1); // Force 1.0 for performance
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.zIndex = '0'; // WebGL behind CSS3D
renderer.domElement.style.pointerEvents = 'none'; // Let interaction pass to CSS3D if hidden
renderer.domElement.style.pointerEvents = 'none'; // Let interaction pass to CSS3D if hidden
document.body.appendChild(renderer.domElement);

// Tone Mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

// Post-Processing Setup
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Optimize: Half-resolution bloom
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    0.8,  // Strength (Lowered)
    0.3,  // Radius (Lowered a bit)
    0.85   // Threshold (High! Only bloom very bright things)
);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// CSS3D Renderer
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
const cssContainer = document.getElementById('css-container');
cssContainer.style.zIndex = '1'; // CSS3D on top
cssContainer.style.position = 'absolute';
cssContainer.style.top = '0';
cssContainer.style.pointerEvents = 'none'; // Container ignores clicks, children (screens) accept them
cssContainer.appendChild(cssRenderer.domElement);

// Input Handling
const keys = {};
const touchControls = new TouchControls(); // [NEW]

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    keys[e.code] = true; // Support both (Code for W/A/S/D independence of layout)
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    keys[e.code] = false;
});

// Game Objects
const spaceship = new Spaceship(scene, camera, keys, touchControls); // Pass touchControls
const environment = new Environment(scene);
const starfield = new Starfield(scene);
const ui = new UI();




// Game Entities
const asteroids = [];
const ufos = [];
const projectiles = []; // Enemy projectiles
const playerProjectiles = []; // Player projectiles
const explosions = []; // Particle systems

// Hook up Spaceship Fire
spaceship.onFire = (pos, dir) => {
    // Cyan lasers
    playerProjectiles.push(new Projectile(scene, pos, dir, 0x00ffff));
};


// Spawn Asteroids
for (let i = 0; i < 50; i++) {
    const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 400
    );
    // Keep clear of center
    if (pos.length() > 50) {
        asteroids.push(new Asteroid(scene, pos));
    }
}

// Spawn UFOs
for (let i = 0; i < 3; i++) {
    const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 300
    );
    if (pos.length() > 80) {
        const ufo = new UFO(scene, pos, spaceship);
        ufo.onFire = (pos, dir) => {
            projectiles.push(new Projectile(scene, pos, dir));
            if (spaceship.state !== 'LANDED') {
                ui.showWarning(1500); // 1.5 seconds warning
            }
        };
        ufos.push(ufo);
    }
}

const planets = [];
const planetConfigs = [
    {
        name: 'Resume',
        pos: [0, -20, -100],
        size: 15,
        texture: 'img/planets/2k_mars.jpg',
        content: '<h2>Resume</h2><p>Experience: Senior Dev...</p><p><a href="#">Download PDF</a></p>' // Placeholder
    },
    {
        name: 'Projects',
        pos: [-120, 40, -200],
        size: 22.5,
        texture: 'img/planets/2k_earth_clouds.jpg',
        content: '<h2>Projects</h2><ul><li><a href="#">Project A</a></li><li><a href="#">Project B</a></li></ul>'
    },
    {
        name: 'About',
        pos: [120, -40, -160],
        size: 18,
        texture: 'img/planets/2k_neptune.jpg',
        content: '<h2>About Me</h2><p>I love space and code!</p>'
    }
];

planetConfigs.forEach(conf => {
    const p = new Planet(scene, cssContainer /* passed div but strictly scene needed if sticking to pure three? No, planet creates CSS3DObject which needs to be added to A scene. We need a CSS3D scene! */, conf);
    // Planet constructor expects (scene, cssScene, config)
    // We haven't created a separate CSS Scene.
    // CSS3DRenderer renders a Scene. It can render the SAME scene if we add CSS3DObjects to it?
    // Yes, cleaner to use the same scene graph if possible, OR separate.
    // Three.js CSS3DObjects are just Object3Ds. We can add them to the main `scene`.
    // But CSS3DRenderer needs to render `scene` and Camera.
    p.onExit = () => spaceship.takeOff();
    planets.push(p);
});

// Since Planet calls `this.mesh.add(this.screen)`, screen is in the main scene graph.
// We just need to render the main scene with cssRenderer too.

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    // Update bloom resolution on resize
    bloomPass.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Planets First (so we track their latest state)
    planets.forEach(p => p.update());

    // Update Spaceship
    spaceship.update();
    touchControls.update(); // [NEW] Update Touch Visuals

    // Update Spaceship
    spaceship.update();

    // Update Entities
    asteroids.forEach(a => a.update());

    const time = performance.now();
    ufos.forEach(u => u.update(time));

    // Update Explosions
    // dt needed? Main loop doesn't calculate dt explicitly here, using fixed 0.016 approximation or need calc.
    // Let's use 0.016 for now or calculate strict dt.
    const dt = 0.016;
    for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        e.update(dt);
        if (e.isDead) {
            explosions.splice(i, 1);
        }
    }

    // Update Stars (Pass speed logic from ship)
    // Ship max speed ~2, Warp ~10 (hypothetically)
    // Starfield expects speed factor.
    // Let's pass normalized speed or raw?
    // Ship stores velocity.
    starfield.update(time, spaceship.getSpeed());


    // Update & Clean Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update();
        if (p.isDead) {
            projectiles.splice(i, 1);
        } else {
            // Projectile Collision with Ship
            if (spaceship.state === 'FLYING' && spaceship.mesh) {
                const dist = p.mesh.position.distanceTo(spaceship.mesh.position);
                if (dist < 2) { // Hit!
                    spaceship.takeHit(p.mesh.position, 1.0); // High impact
                    p.destroy();
                    projectiles.splice(i, 1);
                }
            }
        }
    }



    // Update & Clean Player Projectiles
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const p = playerProjectiles[i];
        p.update();
        if (p.isDead) {
            playerProjectiles.splice(i, 1);
            continue;
        }

        let hit = false;

        // Check vs UFOs
        for (let j = ufos.length - 1; j >= 0; j--) {
            const ufo = ufos[j];
            if (ufo.mesh && p.mesh && p.mesh.position.distanceTo(ufo.mesh.position) < 4) { // 3 (radius) + 0.3 (proj)
                // Destroy UFO
                explosions.push(new Explosion(scene, ufo.mesh.position, 0x00ff00)); // Green Explosion
                scene.remove(ufo.mesh);
                ufos.splice(j, 1);

                // Destroy Projectile
                p.destroy();
                playerProjectiles.splice(i, 1);
                hit = true;
                break;
            }
        }
        if (hit) continue;

        // Check vs Asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            const collider = asteroid.getCollider();
            if (asteroid.mesh && p.mesh && p.mesh.position.distanceTo(collider.center) < collider.radius + 0.5) {
                // Destroy Asteroid (for fun!)
                explosions.push(new Explosion(scene, asteroid.mesh.position, 0xff8800)); // Orange Explosion
                scene.remove(asteroid.mesh);
                asteroids.splice(j, 1);

                p.destroy();
                playerProjectiles.splice(i, 1);
                hit = true;
                break;
            }
        }
    }

    // Collision: Ship vs Asteroids
    if (spaceship.state === 'FLYING' && spaceship.mesh) {
        asteroids.forEach(a => {
            const collider = a.getCollider();
            const dist = spaceship.getPosition().distanceTo(collider.center);

            // Simple check
            if (dist < collider.radius + 1) { // 1 = approx ship radius
                spaceship.takeHit(collider.center, 0.8);
            }
        });
    }

    // Update UI (Speed & Pos)
    // Pass empty object for destinations as main.js handles landing prompts now
    ui.update(spaceship, {});

    // HUD Targeting System
    if (spaceship.state === 'FLYING') {
        let bestTarget = null;
        let minCenterDist = 0.3; // Threshold for locking (NDC space)

        ufos.forEach(u => {
            if (!u.mesh) return;

            // Project UFO position to screen
            const pos = u.mesh.position.clone();
            pos.project(camera); // now in NDC (-1 to +1)

            // Check if in front of camera and within screen bounds
            if (pos.z < 1 && pos.x > -1 && pos.x < 1 && pos.y > -1 && pos.y < 1) {
                const distToCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
                if (distToCenter < minCenterDist) {
                    minCenterDist = distToCenter;
                    bestTarget = { ufo: u, screenPos: pos };
                }
            }
        });

        if (bestTarget) {
            const x = (bestTarget.screenPos.x * .5 + .5) * window.innerWidth;
            const y = (-(bestTarget.screenPos.y * .5) + .5) * window.innerHeight;

            // Approximate box size based on distance
            const dist = spaceship.getPosition().distanceTo(bestTarget.ufo.mesh.position);
            const size = Math.max(40, (500 / dist) * 20); // Scale factor

            ui.updateTargetBox(true, x, y, size);
        } else {
            ui.updateTargetBox(false);
        }
    }

    // Gravity & Landing Logic (Simple version in Main for now, or move to Logic class)

    if (spaceship.state === 'FLYING') {
        let nearest = null;
        let minDist = Infinity;

        let landingCandidate = null;

        planets.forEach(p => {
            const dist = spaceship.getPosition().distanceTo(p.mesh.position);

            // Gravity Pull
            if (dist < p.config.size + 40) {
                const pull = p.mesh.position.clone().sub(spaceship.getPosition()).normalize().multiplyScalar(0.01);
                spaceship.velocity.add(pull);

                if (dist < p.config.size + 20) { // Closer threshold for landing
                    if (dist < minDist) {
                        minDist = dist;
                        landingCandidate = p;
                    }
                }
            }
        });

        const prompt = document.getElementById('landing-prompt');
        // Handle UI and Interaction
        if (landingCandidate) {
            if (prompt) {
                prompt.innerText = `PRESS SPACE TO LAND ON ${landingCandidate.config.name.toUpperCase()}`;
                prompt.classList.add('visible');
            }

            // TRIGGER LANDING (Space or Touch)
            if (keys[' '] || (touchControls && touchControls.actions.land)) {
                spaceship.land(landingCandidate);
                if (prompt) prompt.classList.remove('visible');
            }

        } else {
            if (prompt) prompt.classList.remove('visible');
        }

    } else {
        const prompt = document.getElementById('landing-prompt');
        if (prompt) prompt.classList.remove('visible');
    }

    // Render
    composer.render();
    cssRenderer.render(scene, camera);
}

// Add Space key for landing state tracking
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    keys[e.code] = true;
});


// Handle Resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    cssRenderer.setSize(width, height);
    composer.setSize(width, height);

    if (touchControls) touchControls.resize();
});


animate();

