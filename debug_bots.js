const fs = require('fs');

const envFiles = ['forest.js', 'desert.js', 'arctic.js', 'training.js'];

envFiles.forEach(file => {
    let code = fs.readFileSync('/app/js/scenes/' + file, 'utf8');

    // Make bots global for AppGameManagerInstance if needed
    if (!code.includes("window.AppBots = this.bots;")) {
        code = code.replace(
            /window\.AppProjectileManager = this\.projectileManager;/,
            'window.AppProjectileManager = this.projectileManager;\n        window.AppBots = this.bots;'
        );
    }

    fs.writeFileSync('/app/js/scenes/' + file, code);
});
