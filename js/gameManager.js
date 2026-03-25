class AppGameManager {
    constructor() {
        this.score = 0;
        this.timer = 0;
        this.isRunning = false;

        // Update loops
        this.updatables = [];
    }

    startMatch() {
        this.score = 0;
        this.timer = 0;
        this.isRunning = true;
        this.updatables = [];
        console.log("Match started!");
    }

    endMatch() {
        this.isRunning = false;
        console.log("Match ended. Final Score:", this.score);
    }

    addScore(points) {
        this.score += points;
        // Optionally dispatch event to update UI
        if (window.updateScoreUI) {
            window.updateScoreUI(this.score);
        }
    }

    addUpdatable(obj) {
        if (obj && typeof obj.update === 'function') {
            this.updatables.push(obj);
        }
    }

    update(delta, time) {
        if (!this.isRunning) return;

        this.timer += delta;

        for (let obj of this.updatables) {
            obj.update(delta, time);
        }
    }
}

// Register globally
window.AppGameManager = AppGameManager;
