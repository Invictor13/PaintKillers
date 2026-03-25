const fs = require('fs');

const envFiles = ['forest.js', 'desert.js', 'arctic.js', 'training.js'];

envFiles.forEach(file => {
    let code = fs.readFileSync('/app/js/scenes/' + file, 'utf8');
    // Check if shootables is instantiated and passed to projectile manager
    const match = code.match(/this\.projectileManager = new window\.ProjectileManager\(this\.scene, raycaster, this\.shootables\);/);
    if (!match) console.log(file + " is missing projectile manager integration!");

    // Check if walls, trees, terrain are added
    const match2 = code.match(/this\.shootables\.push\(/g);
    console.log(file + " has " + (match2 ? match2.length : 0) + " places where shootables are pushed.");
});
