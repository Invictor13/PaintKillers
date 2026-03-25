class ProjectileManager {
    constructor(scene, raycaster, shootablesArray) {
        this.scene = scene;
        this.raycaster = raycaster;
        this.shootables = shootablesArray;
        this.projectiles = [];

        // Generate splatter texture once
        this.splatterTex = this.createSplatterTexture();
    }

    createSplatterTexture() {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const cx = c.getContext('2d');
        cx.fillStyle = '#ffffff';
        cx.beginPath(); cx.arc(64, 64, 25, 0, Math.PI*2); cx.fill();
        for(let i=0; i<15; i++) {
            const a = Math.random() * Math.PI*2;
            const d = 25 + Math.random()*25;
            const s = 3 + Math.random()*8;
            cx.beginPath(); cx.arc(64 + Math.cos(a)*d, 64 + Math.sin(a)*d, s, 0, Math.PI*2); cx.fill();
        }
        return new THREE.CanvasTexture(c);
    }

    spawnDecal(pt, norm, colHex) {
        const decMat = new THREE.MeshBasicMaterial({
            map: this.splatterTex,
            color: colHex,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4
        });
        const decGeo = new THREE.PlaneGeometry(0.5 + Math.random()*0.4, 0.5 + Math.random()*0.4);
        const dec = new THREE.Mesh(decGeo, decMat);

        dec.position.copy(pt);
        dec.lookAt(pt.clone().add(norm));
        dec.rotation.z = Math.random() * Math.PI * 2;

        this.scene.add(dec);
        setTimeout(() => {
            if (this.scene) this.scene.remove(dec);
            dec.geometry.dispose();
            dec.material.dispose();
        }, 15000);
    }

    fire(startPos, direction, velocityMag, playerVelocity, colorHex, paintballMaterial) {
        const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), paintballMaterial);

        bullet.position.copy(startPos);
        bullet.position.add(direction.clone().multiplyScalar(0.8)); // Offset slightly forward

        bullet.velocity = direction.clone().multiplyScalar(velocityMag);
        if (playerVelocity) {
             bullet.velocity.add(playerVelocity.clone().multiplyScalar(0.01));
        }
        bullet.userData = { color: colorHex, life: 0 };

        this.projectiles.push(bullet);
        this.scene.add(bullet);
    }

    update(delta) {
        for(let i = this.projectiles.length - 1; i >= 0; i--) {
            const b = this.projectiles[i];
            b.userData.life++;
            b.velocity.y -= 0.015; // Gravity/Bullet drop

            const nextPos = b.position.clone().add(b.velocity);
            const dist = b.position.distanceTo(nextPos);

            this.raycaster.set(b.position, b.velocity.clone().normalize());
            const hitArr = this.raycaster.intersectObjects(this.shootables, true);

            let hit = false;
            if(hitArr.length > 0 && hitArr[0].distance <= dist) {
                hit = true;
                const impact = hitArr[0];
                const obj = impact.object;

                // Splatter!
                this.spawnDecal(impact.point, impact.face ? impact.face.normal : new THREE.Vector3(0,1,0), b.userData.color);

                // Check hits (Targets)
                if(obj.userData && obj.userData.isTarget && window.AppGameManagerInstance) {
                    window.AppGameManagerInstance.addScore(obj.userData.score || 50);
                    if (window.triggerHitMarker) window.triggerHitMarker(false);
                }
                else if (obj.userData && (obj.userData.isBody || obj.userData.isHeadshot)) {
                    if (window.triggerHitMarker) window.triggerHitMarker(obj.userData.isHeadshot);
                }
            }

            if(hit || b.position.y < -10 || b.userData.life > 150) {
                this.scene.remove(b);
                b.geometry.dispose();
                // Do not dispose material as it's shared
                this.projectiles.splice(i, 1);
            } else {
                b.position.copy(nextPos);
            }
        }
    }
}

window.ProjectileManager = ProjectileManager;
