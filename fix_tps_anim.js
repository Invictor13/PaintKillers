const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/player.js', 'utf8');
// Fix TPS animation direction
code = code.replace(
    /this\.tpsPlayerGrp\.rotation\.y = this\.yawObject\.rotation\.y \+ Math\.PI;/g,
    'this.tpsPlayerGrp.rotation.y = this.yawObject.rotation.y + Math.PI;'
);
fs.writeFileSync('/app/js/entities/player.js', code);
