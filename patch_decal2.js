const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/projectile.js', 'utf8');

// The issue might be that polygonOffsetFactor: -4 is not enough for z-fighting,
// OR that depthTest is true but transparent objects are rendered before opaque objects.
// Wait, depthWrite is false, so it shouldn't hide behind other transparent objects, but it might still z-fight.
// I'll add an explicit offset to the normal and increase offset factor.

code = code.replace(
    /dec\.position\.copy\(pt\);/,
    'dec.position.copy(pt.clone().add(norm.clone().multiplyScalar(0.02))); // Offset along normal to prevent z-fighting'
);

code = code.replace(
    /dec\.lookAt\(pt\.clone\(\)\.add\(norm\)\);/,
    'dec.lookAt(dec.position.clone().add(norm));'
);

code = code.replace(
    /polygonOffsetFactor: -4, \n            polygonOffsetUnits: -4/,
    'polygonOffsetFactor: -10, \n            polygonOffsetUnits: -10'
);

fs.writeFileSync('/app/js/entities/projectile.js', code);
console.log("Patched Decal z-fighting");
