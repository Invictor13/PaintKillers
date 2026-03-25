const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/player.js', 'utf8');
const match = code.match(/this\.camera\.position\.lerp\(new THREE\.Vector3\(0\.6, 0\.5, (\d+\.\d+)\), 0\.2\);/);
console.log(match ? "Camera Z: " + match[1] : "Not found");
