class GameManager {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.currentScene = null;

        // Initial setup
        this.init();
    }

    init() {
        // Load the initial scene
        this.loadScene(new MenuScene(this));
    }

    loadScene(scene) {
        // Cleanup the current scene if it exists
        if (this.currentScene) {
            this.currentScene.destroy();
        }

        // Set and initialize the new scene
        this.currentScene = scene;
        this.currentScene.init(this.appContainer);
    }

    loadArena(arenaName) {
        if (arenaName === 'forest') {
            this.loadScene(new window.ForestScene(new window.AppGameManager()));
        } else {
            console.warn(`Arena ${arenaName} not implemented yet, loading forest instead.`);
            this.loadScene(new window.ForestScene(new window.AppGameManager()));
        }
    }
}

// Start the application when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
});
