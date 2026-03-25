const fs = require('fs');

const envFiles = ['forest.js', 'desert.js', 'arctic.js', 'training.js'];

envFiles.forEach(file => {
    let code = fs.readFileSync('/app/js/scenes/' + file, 'utf8');

    // Add bot to constructor
    if (!code.includes("this.bots = [];")) {
        code = code.replace(
            /this\.shootables = \[\];/,
            'this.shootables = [];\n        this.bots = [];'
        );
    }

    // Add bots instantiation in init() after projectileManager
    if (!code.includes("for(let i=0; i<3; i++) {")) {
        code = code.replace(
            /window\.AppProjectileManager = this\.projectileManager;/,
            'window.AppProjectileManager = this.projectileManager;\n\n        // Spawn Bots\n        if (window.Bot) {\n            for(let i=0; i<3; i++) {\n                const b = new window.Bot(this.scene, this.shootables);\n                this.bots.push(b);\n            }\n        }'
        );
    }

    // Add bots update in animate()
    if (!code.includes("this.bots.forEach")) {
        code = code.replace(
            /if \(this\.projectileManager\) this\.projectileManager\.update\(delta\);/,
            'if (this.projectileManager) this.projectileManager.update(delta);\n        if (this.player && this.bots) {\n            this.bots.forEach(b => b.update(delta, this.player.yawObject.position));\n        }'
        );
    }

    fs.writeFileSync('/app/js/scenes/' + file, code);
    console.log("Patched " + file);
});
