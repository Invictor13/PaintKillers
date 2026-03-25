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
        let newScene = null;
        const manager = new window.AppGameManager();

        switch (arenaName) {
            case 'forest':
                newScene = new window.ForestScene(manager);
                break;
            case 'desert':
                newScene = new window.DesertScene(manager);
                break;
            case 'arctic':
                newScene = new window.ArcticScene(manager);
                break;
            case 'training':
                newScene = new window.TrainingScene(manager);
                break;
            default:
                console.warn(`Arena ${arenaName} not recognized, falling back to menu.`);
                newScene = new window.MenuScene(this);
        }

        if (newScene) {
            this.loadScene(newScene);
        }
    }
}

// Start the application when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
});
