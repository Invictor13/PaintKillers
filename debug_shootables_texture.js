const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/projectile.js', 'utf8');
const match = code.match(/this\.spawnDecal\(impact\.point, impact\.face \? impact\.face\.normal \: new THREE\.Vector3\(0\,1\,0\), b\.userData\.color\);/);
console.log(match ? "Found spawnDecal call" : "Not found spawnDecal call");
