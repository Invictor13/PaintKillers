// Let's create a script that modifies projectile.js to log hits if needed, or inspect if the material of decals is missing textures.
const fs = require('fs');
let projCode = fs.readFileSync('/app/js/entities/projectile.js', 'utf8');

// The issue might be the splatter texture creation!
// In createSplatterTexture, `depthWrite: false, polygonOffset: true...`
// Wait, the canvas texture is not being converted correctly maybe?
// Let's check:
const texCode = `    createSplatterTexture() {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const cx = c.getContext('2d');
        cx.fillStyle = '#ffffff';
        cx.beginPath(); cx.arc(64, 64, 25, 0, Math.PI*2); cx.fill();
        for(let i=0; i<15; i++) {
            const a = Math.random() * Math.PI*2;
            const d = 25 + Math.random()*25;
            cx.beginPath(); cx.arc(64 + Math.cos(a)*d, 64 + Math.sin(a)*d, Math.random()*10, 0, Math.PI*2); cx.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        return tex;
    }`;

console.log(projCode.includes("CanvasTexture(c)"));
