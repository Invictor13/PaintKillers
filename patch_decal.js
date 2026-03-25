const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/projectile.js', 'utf8');

code = code.replace(
    /dec\.position\.copy\(pt\);/,
    'dec.position.copy(pt.clone().add(norm.clone().multiplyScalar(0.01))); // Slight offset to fix Z-fighting'
);

fs.writeFileSync('/app/js/entities/projectile.js', code);
