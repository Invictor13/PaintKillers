const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/player.js', 'utf8');

// The player in TPS is facing the camera instead of facing away from it.
// We should check how tpsPlayerGrp is rotated.

const match = code.match(/this\.tpsPlayerGrp\.rotation\.y = (.+);/);
console.log(match ? match[0] : "Not found");
