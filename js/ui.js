export class UI {
    constructor() {
        this.debugEl = document.getElementById('debug-info');
        this.promptEl = document.getElementById('interaction-prompt');
        this.warningEl = document.getElementById('warning-msg');
        this.warningTimeout = null;
    }

    update(spaceship, destinationsResult) {
        // Update speed and position debug info
        const speed = (spaceship.getSpeed() * 100).toFixed(0);
        const pos = spaceship.getPosition();
        this.debugEl.innerText = `Speed: ${speed} | Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;

        // Handle interaction prompt
        if (destinationsResult.collided) {
            this.promptEl.innerText = `Navigating to ${destinationsResult.item.userData.name}...`;
            this.promptEl.classList.add('visible');
            // In a real scenario, we might wait a moment before navigating
            // window.location.href = destinationsResult.item.userData.url;
        } else if (destinationsResult.nearest && destinationsResult.distance < 20) {
            this.promptEl.innerText = `Fly to ${destinationsResult.nearest.userData.name}`;
            this.promptEl.classList.add('visible');
        } else {
            this.promptEl.classList.remove('visible');
        }
    }

    showWarning(duration = 2000) {
        this.warningEl.classList.add('active');

        if (this.warningTimeout) clearTimeout(this.warningTimeout);

        this.warningTimeout = setTimeout(() => {
            if (this.warningEl) this.warningEl.classList.remove('active');
            this.warningTimeout = null;
        }, duration);
    }

    updateTargetBox(visible, x = 0, y = 0, size = 60) {
        const box = document.getElementById('target-box');
        if (!box) return;

        if (visible) {
            box.style.display = 'block';
            box.style.left = x + 'px';
            box.style.top = y + 'px';
            box.style.width = size + 'px';
            box.style.height = size + 'px';
        } else {
            box.style.display = 'none';
        }
    }
}
