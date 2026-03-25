const fs = require('fs');
let code = fs.readFileSync('/app/index.html', 'utf8');

// Add <script src="js/entities/bot.js"></script> after projectile.js
code = code.replace(
    /<script src="js\/entities\/projectile\.js"><\/script>/,
    '<script src="js/entities/projectile.js"></script>\n    <script src="js/entities/bot.js"></script>'
);

fs.writeFileSync('/app/index.html', code);
console.log("Patched index.html");
