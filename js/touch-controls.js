export class TouchControls {
    constructor() {
        this.move = { x: 0, y: 0 }; // Virtual Joystick (Left)
        this.look = { x: 0, y: 0 }; // Touch Drag (Right)
        this.actions = {
            fire: false,
            warp: false,
            land: false,
            up: false,
            down: false
        };


        this.canvas = document.getElementById('touch-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.joystickOrigin = null; // {x, y}
        this.joystickCurrent = null; // {x, y}
        this.maxRadius = 100;

        this.lookOrigin = null;
        this.sensitvity = 2.0;

        // Multi-touch tracking
        this.touches = {}; // id -> type ('joystick' | 'look')

        this.resize();
        this.bindEvents();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        // Prevent default touch actions (scrolling)
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

        // Bind UI Buttons
        const warpBtn = document.getElementById('btn-warp');
        if (warpBtn) {
            warpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.actions.warp = true; });
            warpBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.actions.warp = false; });
        }

        const upBtn = document.getElementById('btn-up');
        if (upBtn) {
            upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.actions.up = true; });
            upBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.actions.up = false; });
        }

        const downBtn = document.getElementById('btn-down');
        if (downBtn) {
            downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.actions.down = true; });
            downBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.actions.down = false; });
        }


        // Bind Landing Prompt (make it tappable)
        const landPrompt = document.getElementById('landing-prompt');
        if (landPrompt) {
            landPrompt.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.actions.land = true;
                // Auto-reset land action after a frame because it's a trigger
                setTimeout(() => this.actions.land = false, 100);
            });
        }
    }

    onTouchStart(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const x = t.clientX;
            const y = t.clientY;

            // Logic: Left half = Joystick, Right half = Look/Fire
            if (x < window.innerWidth / 2) {
                // Joystick
                this.touches[t.identifier] = {
                    type: 'joystick',
                    origin: { x, y },
                    current: { x, y }
                };
                this.joystickOrigin = { x, y };
                this.joystickCurrent = { x, y };
            } else {
                // Look
                this.touches[t.identifier] = {
                    type: 'look',
                    startX: x,
                    startY: y,
                    lastX: x,
                    lastY: y,
                    startTime: Date.now()
                };
            }
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const touchState = this.touches[t.identifier];
            if (!touchState) continue;

            if (touchState.type === 'joystick') {
                touchState.current = { x: t.clientX, y: t.clientY };
                this.joystickCurrent = touchState.current;

                // Current vector
                let dx = t.clientX - touchState.origin.x;
                let dy = t.clientY - touchState.origin.y;

                // Clamp magnitude
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > this.maxRadius) {
                    const ratio = this.maxRadius / distance;
                    dx *= ratio;
                    dy *= ratio;
                    this.joystickCurrent.x = touchState.origin.x + dx;
                    this.joystickCurrent.y = touchState.origin.y + dy;
                }

                // Normalize output -1 to 1
                this.move.x = dx / this.maxRadius;
                this.move.y = dy / this.maxRadius;
            }
            else if (touchState.type === 'look') {
                const dx = t.clientX - touchState.lastX;
                const dy = t.clientY - touchState.lastY;

                this.look.x = dx * this.sensitvity * 0.002;
                this.look.y = dy * this.sensitvity * 0.002;

                touchState.lastX = t.clientX;
                touchState.lastY = t.clientY;
            }
        }
    }

    onTouchEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const touchState = this.touches[t.identifier];
            if (!touchState) continue;

            if (touchState.type === 'joystick') {
                this.move = { x: 0, y: 0 };
                this.joystickOrigin = null;
                this.joystickCurrent = null;
            } else if (touchState.type === 'look') {
                this.look = { x: 0, y: 0 }; // Stop rotating

                // Check Tap
                const duration = Date.now() - touchState.startTime;
                const dist = Math.sqrt(Math.pow(t.clientX - touchState.startX, 2) + Math.pow(t.clientY - touchState.startY, 2));

                if (duration < 250 && dist < 10) {
                    this.actions.fire = true;
                    setTimeout(() => this.actions.fire = false, 100);
                }
            }

            delete this.touches[t.identifier];
        }
    }

    update() {
        // Draw Interface
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Joystick
        if (this.joystickOrigin && this.joystickCurrent) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;

            // Base
            this.ctx.beginPath();
            this.ctx.arc(this.joystickOrigin.x, this.joystickOrigin.y, this.maxRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Stick
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(this.joystickCurrent.x, this.joystickCurrent.y, 40, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}
