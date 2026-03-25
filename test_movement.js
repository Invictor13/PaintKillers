const fs = require('fs');
let code = fs.readFileSync('/app/js/entities/player.js', 'utf8');
const match = code.match(/direction\.z = Number\(this\.moveState\.f\) - Number\(this\.moveState\.b\);/);
console.log(match ? "Found forward mapping: " + match[0] : "Not found");
const match2 = code.match(/direction\.x = Number\(this\.moveState\.r\) - Number\(this\.moveState\.l\);/);
console.log(match2 ? "Found strafe mapping: " + match2[0] : "Not found");
