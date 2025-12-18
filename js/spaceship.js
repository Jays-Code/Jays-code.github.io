import * as THREE from 'three';
import { Shield } from './shield.js';


export class Spaceship {
    constructor(scene, camera, keys = {}, touchControls = null) {
        this.scene = scene;
        this.camera = camera;
        this.keys = keys; // [NEW] Keep ref
        this.touchControls = touchControls; // [NEW] Keep ref
        this.mesh = null;

        this.velocity = new THREE.Vector3(); // Local velocity
        this.input = { forward: false, backward: false, left: false, right: false, up: false, down: false, turnLeft: false, turnRight: false, fire: false };
        this.maxSpeed = 1.2;
        this.acceleration = 0.05;
        this.decay = 0.95;
        this.rotationSpeed = 0.002;
        this.yawOffset = 0;

        // Impact / Shake
        this.trauma = 0; // Shake intensity (0-1)
        this.impactVelocity = new THREE.Vector3();

        // Weapons
        this.canFire = true;
        this.onFire = null;


        // State Machine
        this.state = 'FLYING'; // FLYING, LANDING, LANDED
        this.landTarget = null;

        // Landing Animation
        this.landingStartTime = 0;
        this.landingDuration = 4000; // 4 seconds cinematic
        this.startPos = new THREE.Vector3();
        this.startRot = new THREE.Quaternion();

        this.shield = null;

        this.mouseX = 0;
        this.mouseY = 0;
        this.windowHalfX = window.innerWidth / 2;
        this.windowHalfY = window.innerHeight / 2;

        this.initModel();
        this.bindMouseEvents(); // [RESTORED]
    }




    initModel() {
        this.mesh = new THREE.Group();

        // Colors
        const bodyColor = 0xcccccc;
        const detailColor = 0x333333;
        const glassColor = 0x00aaff;
        const engineColor = 0x00ffff;

        const matBody = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.8 });
        const matDark = new THREE.MeshStandardMaterial({ color: detailColor, roughness: 0.7, metalness: 0.5 });
        const matGlass = new THREE.MeshPhysicalMaterial({
            color: glassColor,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.7,
            emissive: glassColor,
            emissiveIntensity: 0.2
        });
        const matEngine = new THREE.MeshBasicMaterial({ color: engineColor });

        // 1. Fuselage
        // Main body
        const fuselageGeo = new THREE.ConeGeometry(0.5, 4, 16);
        fuselageGeo.rotateX(-Math.PI / 2); // Point towards -Z
        const fuselage = new THREE.Mesh(fuselageGeo, matBody);
        this.mesh.add(fuselage);

        // 2. Wings (Delta Shape using flattened Box or custom)
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(1.5, -1.5);
        wingShape.lineTo(1.5, -0.5);
        wingShape.lineTo(0, 1.0);

        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
        wingGeo.center(); // Center geometry

        // Left Wing
        const leftWing = new THREE.Mesh(wingGeo, matBody);
        leftWing.rotation.x = -Math.PI / 2; // Flat
        leftWing.position.set(-0.8, 0, 0.5);
        leftWing.scale.set(1.5, 1.5, 1);
        this.mesh.add(leftWing);

        // Right Wing
        const rightWing = leftWing.clone();
        rightWing.scale.set(-1.5, 1.5, 1); // Mirror
        rightWing.position.set(0.8, 0, 0.5);
        this.mesh.add(rightWing);

        // 3. Cockpit
        const cockpitGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
        cockpitGeo.rotateX(-Math.PI / 2);
        const cockpit = new THREE.Mesh(cockpitGeo, matGlass);
        cockpit.position.set(0, 0.3, -0.5);
        this.mesh.add(cockpit);

        // 4. Engines
        const engineGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 16);
        engineGeo.rotateX(-Math.PI / 2);

        const leftEngine = new THREE.Mesh(engineGeo, matDark);
        leftEngine.position.set(-0.6, 0.1, 1.5);
        this.mesh.add(leftEngine);

        const rightEngine = leftEngine.clone();
        rightEngine.position.set(0.6, 0.1, 1.5);
        this.mesh.add(rightEngine);

        // Engine Glows
        const glowGeo = new THREE.ConeGeometry(0.15, 0.5, 16);
        glowGeo.rotateX(Math.PI / 2); // Point back (+Z)
        glowGeo.translate(0, -0.25, 0); // Offset origin

        const leftGlow = new THREE.Mesh(glowGeo, matEngine);
        leftGlow.position.set(0, 0, 0.5);
        leftEngine.add(leftGlow);

        const rightGlow = leftGlow.clone();
        rightEngine.add(rightGlow);

        // Add to scene
        this.scene.add(this.mesh);

        // Initialize Shield
        this.shield = new Shield(this.scene, this.mesh);

        // Position camera behind the ship
        this.mesh.add(this.camera);
        this.camera.position.set(0, 2, 8); // Higher and further back for better view
        this.camera.lookAt(0, 0, -20);    // Look well ahead
        this.camera.lookAt(0, 0, -20);    // Look well ahead
    }

    takeHit(sourcePos, forceMagnitude = 0.5) {
        if (!this.mesh) return;

        // 1. Calculate push direction (away from source)
        const pushDir = this.mesh.position.clone().sub(sourcePos).normalize();

        // 2. Add impact velocity
        this.impactVelocity.add(pushDir.multiplyScalar(forceMagnitude));

        // 3. Add trauma
        this.trauma = Math.min(this.trauma + 0.5, 1.0);

        // Trigger Shield Visuals
        if (this.shield) {
            this.shield.hit();
        }
    }


    onFire(pos, dir) {
        // Placeholder
    }

    /* 
       Keyboard handlers moved to Main or abstracted. 
       We now poll this.keys and this.touchControls in update() 
    */
    handleInput() {
        // Reset boolean inputs for this frame (simulating poll)
        this.input.forward = this.keys['w'] || this.keys['W'];
        this.input.backward = this.keys['s'] || this.keys['S'];
        this.input.turnLeft = this.keys['a'] || this.keys['A'];
        this.input.turnRight = this.keys['d'] || this.keys['D'];

        // Strafe
        this.input.left = this.keys['q'] || this.keys['Q'] || this.keys['ArrowLeft'];
        this.input.right = this.keys['e'] || this.keys['E'] || this.keys['ArrowRight'];
        this.input.up = this.keys['r'] || this.keys['R'] || this.keys['ArrowUp']; // Up
        this.input.down = this.keys['Control'] || this.keys['f'] || this.keys['F'] || this.keys['ArrowDown']; // Down




        this.input.fire = this.keys[' '] || (this.touchControls && this.touchControls.actions.fire);
        this.input.warp = this.keys['Shift'] || (this.touchControls && this.touchControls.actions.warp);


        // Mobile Overrides
        if (this.touchControls) {
            const tm = this.touchControls.move;
            // Joystick Y is inverted (-1 is up)
            if (tm.y < -0.2) this.input.forward = true;
            if (tm.y > 0.2) this.input.backward = true;
            // Joystick X -> Turn (Yaw)
            if (tm.x < -0.2) this.input.turnLeft = true;
            if (tm.x > 0.2) this.input.turnRight = true;


            // Touch Look
            const tl = this.touchControls.look;
            this.mouseX -= tl.x * 500; // sensitivity adj
            this.mouseY -= tl.y * 500;

            // Buttons Override
            if (this.touchControls.actions.up) this.input.up = true;
            if (this.touchControls.actions.down) this.input.down = true;
        }

    }


    bindMouseEvents() {
        document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        document.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        document.addEventListener('mouseup', () => { this.input.fire = false; }, false);

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== document.body) {
                this.input.fire = false;
            }
        });
    }

    onKeyDown(event) {

        switch (event.code) {
            case 'KeyW': this.input.forward = true; break;
            case 'KeyS': this.input.backward = true; break;
            case 'KeyA': this.input.turnLeft = true; break;
            case 'KeyD': this.input.turnRight = true; break;
            case 'KeyQ': this.input.left = true; break;
            case 'KeyE': this.input.right = true; break;
            case 'KeyR': this.input.up = true; break;
            case 'KeyF': this.input.down = true; break;

            case 'ArrowUp': this.input.up = true; break;
            case 'ArrowDown': this.input.down = true; break;
            case 'ArrowLeft': this.input.left = true; break;
            case 'ArrowRight': this.input.right = true; break;

            case 'Space': this.input.fire = true; break;

            case 'ShiftLeft': this.input.warp = true; break;
            case 'ShiftRight': this.input.warp = true; break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.input.forward = false; break;
            case 'KeyS': this.input.backward = false; break;
            case 'KeyA': this.input.turnLeft = false; break;
            case 'KeyD': this.input.turnRight = false; break;
            case 'KeyQ': this.input.left = false; break;
            case 'KeyE': this.input.right = false; break;
            case 'KeyR': this.input.up = false; break;
            case 'KeyF': this.input.down = false; break;

            case 'ArrowUp': this.input.up = false; break;
            case 'ArrowDown': this.input.down = false; break;
            case 'ArrowLeft': this.input.left = false; break;
            case 'ArrowRight': this.input.right = false; break;

            case 'Space': this.input.fire = false; break;

            case 'ShiftLeft': this.input.warp = false; break;
            case 'ShiftRight': this.input.warp = false; break;
        }
    }

    onMouseDown(event) {
        // If clicking on UI, ignore
        if (event.target.closest('a') || event.target.closest('button') || event.target.closest('.interactive')) {
            return;
        }

        // Request Pointer Lock if not locked
        if (document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        } else {
            // If already locked, fire
            this.input.fire = true;
        }
    }

    onMouseMove(event) {
        if (document.pointerLockElement === document.body) {
            // Pointer Lock Mode: Accumulate movement
            this.mouseX += event.movementX;
            this.mouseY += event.movementY;

            // Clamp "Virtual Joystick" to screen size bounds
            // Assuming windowHalfX/Y represents the max throw of the stick
            if (this.mouseX > this.windowHalfX) this.mouseX = this.windowHalfX;
            if (this.mouseX < -this.windowHalfX) this.mouseX = -this.windowHalfX;
            if (this.mouseY > this.windowHalfY) this.mouseY = this.windowHalfY;
            if (this.mouseY < -this.windowHalfY) this.mouseY = -this.windowHalfY;

        } else {
            // Cursor Mode: Do NOT update mouseX/Y for steering.
            // Reset to center or keep last? Resetting to 0 stops turning when unlocked.
            this.mouseX = 0;
            this.mouseY = 0;
        }
    }


    land(planet) {
        if (this.state !== 'FLYING') return;
        this.state = 'LANDING';
        this.landTarget = planet;
        this.velocity.set(0, 0, 0); // Kill speed

        // Capture start state
        this.startPos.copy(this.mesh.position);
        this.startRot.copy(this.mesh.quaternion);
        this.landingStartTime = performance.now();

        // Visuals: Fade to white/fog
        const overlay = document.getElementById('cinematic-overlay');
        if (overlay) {
            overlay.style.transition = `opacity ${this.landingDuration}ms ease-in`;
            overlay.classList.add('active');
        }

        // Hide Prompt
        const prompt = document.getElementById('interaction-prompt');
        if (prompt) prompt.classList.remove('visible');
    }


    takeOff() {
        if (this.state !== 'LANDED') return;
        this.state = 'FLYING';
        this.landTarget = null;

        // Hide Spectator
        const spectator = document.getElementById('spectator-mode');
        if (spectator) spectator.style.display = 'none';

        // Show ship again

        this.mesh.traverse(child => {
            if (child.isMesh) child.visible = true;
        });

        // Push ship away slightly
        this.velocity.z = 0.5;
        this.mesh.translateZ(5);
    }

    update() {
        if (!this.mesh) return;

        // Poll Inputs
        this.handleInput();

        // Update Shield

        if (this.shield) {
            this.shield.update(performance.now(), 0.016);
        }

        if (this.state === 'FLYING') {
            this.updateFlying();
        } else if (this.state === 'LANDING' || this.state === 'LANDED') {
            this.updateLanding(); // Keep locking to the target position
        }
    }

    updateLanding() {
        if (!this.landTarget) return;

        // 1. Calculate Target (World Space)
        // Position: slightly above landing pad
        const localTargetPos = new THREE.Vector3(0, this.landTarget.config.size + 2, 25);
        // LookAt: screen center
        const localLookAtPos = new THREE.Vector3(0, this.landTarget.config.size + 3, 0);

        this.landTarget.mesh.updateMatrixWorld();
        const worldTargetPos = localTargetPos.applyMatrix4(this.landTarget.mesh.matrixWorld);
        const worldLookAtPos = localLookAtPos.applyMatrix4(this.landTarget.mesh.matrixWorld);

        // Calculate Target Rotation
        // We want the ship to end up at worldTargetPos, looking at worldLookAtPos.
        // Ship's "forward" is -Z.
        // So -Z axis should point to worldLookAtPos.

        // Construct target quaternion
        const dummy = new THREE.Object3D();
        dummy.position.copy(worldTargetPos);

        // Fix Rotation: Ship faces -Z. lookAt points +Z.
        // We want -Z to point at worldLookAtPos.
        // Therefore +Z must point AWAY from worldLookAtPos.
        // AntiTarget = Pos + (Pos - LookAt)
        const forward = worldLookAtPos.clone().sub(worldTargetPos);
        const antiTarget = worldTargetPos.clone().sub(forward); // Point behind

        dummy.lookAt(antiTarget);

        const targetRot = dummy.quaternion;

        // 2. Interpolate
        const now = performance.now();
        const progress = (now - this.landingStartTime) / this.landingDuration;
        const t = Math.min(Math.max(progress, 0), 1);

        // Easing: SmoothStep (t * t * (3 - 2 * t)) or Cubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // EaseInOutCubic

        this.mesh.position.lerpVectors(this.startPos, worldTargetPos, ease);
        this.mesh.quaternion.slerpQuaternions(this.startRot, targetRot, ease);

        if (t >= 1) {
            this.state = 'LANDED';
            this.mesh.position.copy(worldTargetPos);
            this.mesh.quaternion.copy(targetRot);

            // Unhide
            this.mesh.traverse(child => { if (child.isMesh) child.visible = true; });

            // Fade Out Overlay
            const overlay = document.getElementById('cinematic-overlay');
            if (overlay) {
                overlay.style.transition = 'opacity 1s ease-out';
                overlay.classList.remove('active');
            }

            // Show Spectator Mode
            const spectator = document.getElementById('spectator-mode');
            if (spectator) spectator.style.display = 'block';

            // Ensure cursor is unlocked for menu interaction
            if (document.pointerLockElement === document.body) {
                document.exitPointerLock();
            }
        }
    }

    updateFlying() {
        // Rotation Rates
        // Mouse X controls Yaw Rate (Continuous turning)
        // Add minimal noise if trauma > 0
        let shakeX = 0, shakeY = 0;
        if (this.trauma > 0) {
            const shake = this.trauma * this.trauma * this.trauma; // Cubic falloff
            shakeX = (Math.random() - 0.5) * shake * 0.1;
            shakeY = (Math.random() - 0.5) * shake * 0.1;
            this.trauma = Math.max(0, this.trauma - 0.02); // Decay
        }

        const mouseYawRate = (-this.mouseX * 0.00005) + shakeX;
        const targetRotationX = (-this.mouseY * this.rotationSpeed) + shakeY;


        // Keyboard Turning (Yaw Velocity)
        const turnAccel = 0.001;
        const maxTurnSpeed = 0.025;

        if (this.input.turnLeft) {
            this.yawOffset += turnAccel;
        } else if (this.input.turnRight) {
            this.yawOffset -= turnAccel;
        } else {
            this.yawOffset *= 0.9; // Decay
        }

        // Clamp Turn Speed
        if (this.yawOffset > maxTurnSpeed) this.yawOffset = maxTurnSpeed;
        if (this.yawOffset < -maxTurnSpeed) this.yawOffset = -maxTurnSpeed;

        // Apply Continuous Yaw Rotation
        this.mesh.rotation.y += this.yawOffset + mouseYawRate;

        // Pitch (Up/Down) - Remains absolute (target) for stability
        // Add "Swoop" - Pitch up/down based on vertical speed
        const pitchFromSpeed = this.velocity.y * 0.5;
        this.mesh.rotation.x += (targetRotationX + pitchFromSpeed - this.mesh.rotation.x) * 0.1;


        // Warp Drive Logic
        let currentMaxSpeed = this.maxSpeed;
        if (this.input.warp) {
            currentMaxSpeed = this.maxSpeed * 3.0; // Boost speed
            this.velocity.z -= this.acceleration * 2.0; // Auto-thrust

            // FOV Warp Effect
            if (this.camera.fov < 110) {
                this.camera.fov += 0.5;
                this.camera.updateProjectionMatrix();
            }
        } else {
            // Reset FOV
            if (this.camera.fov > 75) {
                this.camera.fov -= 0.5;
                this.camera.updateProjectionMatrix();
            }
        }

        // Movement Logic
        if (this.input.forward) this.velocity.z -= this.acceleration;

        if (this.input.backward) this.velocity.z += this.acceleration;
        if (this.input.left) this.velocity.x -= this.acceleration;
        if (this.input.right) this.velocity.x += this.acceleration;

        // Vertical Strafing (Up/Down)
        if (this.input.up) this.velocity.y += this.acceleration;
        if (this.input.down) this.velocity.y -= this.acceleration;

        this.velocity.multiplyScalar(this.decay);

        // Impact Velocity Decay
        this.velocity.add(this.impactVelocity);
        this.impactVelocity.multiplyScalar(0.9); // Quick decay



        this.velocity.clampLength(0, currentMaxSpeed);



        const worldVelocity = this.velocity.clone().applyQuaternion(this.mesh.quaternion);
        this.mesh.position.add(worldVelocity);

        // Banking (Roll)
        // Bank based on Turn Rate + Mouse Position + Strafe
        const rollFromTurn = this.yawOffset * 5.0;
        const rollFromSpeed = -this.velocity.x * 0.8;
        const targetRoll = (-this.mouseX * 0.001) + rollFromSpeed + rollFromTurn;



        this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * 0.1;

        // Weapons Fire
        if (this.input.fire) {
            this.fire();
        }
    }


    fire() {
        if (!this.canFire) return;

        if (this.onFire) {
            // Fire from two distinct points (e.g., wings or below fuselage)
            // Left Side
            const leftPos = this.mesh.position.clone().add(
                new THREE.Vector3(-0.5, -0.2, -1).applyQuaternion(this.mesh.quaternion)
            );
            // Right Side
            const rightPos = this.mesh.position.clone().add(
                new THREE.Vector3(0.5, -0.2, -1).applyQuaternion(this.mesh.quaternion)
            );

            // Forward direction
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);

            this.onFire(leftPos, dir);
            this.onFire(rightPos, dir);
        }

        this.canFire = false;
        setTimeout(() => { this.canFire = true; }, 250); // Fire rate
    }

    getPosition() {
        return this.mesh.position;
    }

    getSpeed() {
        return this.velocity.length();
    }
}
