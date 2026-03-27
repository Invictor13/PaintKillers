class Flag {
    constructor(scene, team, spawnPos, color) {
        this.scene = scene;
        this.team = team;
        this.spawnPos = spawnPos.clone();
        this.isCarried = false;
        this.carrier = null;

        this.meshGroup = new THREE.Group();
        this.meshGroup.position.copy(this.spawnPos);

        // Base / Pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), new THREE.MeshStandardMaterial({color: 0x888888, metalness: 0.8}));
        pole.position.y = 1.5;
        this.meshGroup.add(pole);

        // Cloth
        const clothGeo = new THREE.PlaneGeometry(1.2, 0.8, 10, 10);
        this.clothMat = new THREE.MeshStandardMaterial({color: color, side: THREE.DoubleSide, roughness: 0.6});
        this.cloth = new THREE.Mesh(clothGeo, this.clothMat);
        this.cloth.position.set(0.6, 2.5, 0);
        this.meshGroup.add(this.cloth);

        // Base plate
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2), new THREE.MeshStandardMaterial({color: 0x333333}));
        base.position.y = 0.1;
        this.meshGroup.add(base);

        this.scene.add(this.meshGroup);

        // Store original cloth vertices for wind animation
        this.baseVertices = [];
        const posAttribute = this.cloth.geometry.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            this.baseVertices.push(posAttribute.getZ(i));
        }

        // Glow/Halo
        const glowMat = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.3, side: THREE.DoubleSide});
        this.glow = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 4, 16), glowMat);
        this.glow.position.y = 2;
        this.meshGroup.add(this.glow);
    }

    update(delta, time) {
        // Wind Animation
        const posAttribute = this.cloth.geometry.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const wave = Math.sin(x * 2 + time * 5) * 0.1 * x;
            posAttribute.setZ(i, this.baseVertices[i] + wave);
        }
        posAttribute.needsUpdate = true;

        this.glow.rotation.y += delta;
        this.glow.scale.x = 1 + Math.sin(time*3)*0.1;
        this.glow.scale.z = 1 + Math.sin(time*3)*0.1;

        if (this.isCarried && this.carrier) {
            // Attach flag above carrier
            let carrierPos = this.carrier.yawObject ? this.carrier.yawObject.position : this.carrier.meshGroup.position;
            this.meshGroup.position.copy(carrierPos);
            this.meshGroup.position.y += 2.0; // Above head

            // If carrier died
            if (this.carrier.health !== undefined && this.carrier.health <= 0) {
                this.drop();
            } else if (this.carrier.isDead) { // Player death check if implemented differently
                this.drop();
            }
        } else {
            // Ensure flag is on ground if dropped
            if (window.getTerrainHeight) {
                let ty = window.getTerrainHeight(this.meshGroup.position.x, this.meshGroup.position.z);
                if (this.meshGroup.position.y > ty) {
                    this.meshGroup.position.y -= 9.8 * delta;
                    if (this.meshGroup.position.y < ty) this.meshGroup.position.y = ty;
                }
            }
        }
    }

    pickup(entity) {
        if (this.isCarried) return;
        this.isCarried = true;
        this.carrier = entity;
        // Make it slightly smaller while carried
        this.meshGroup.scale.set(0.5, 0.5, 0.5);
    }

    drop() {
        this.isCarried = false;
        this.carrier = null;
        this.meshGroup.scale.set(1, 1, 1);

        // Raycast down to place exactly on terrain
        if (window.getTerrainHeight) {
            this.meshGroup.position.y = window.getTerrainHeight(this.meshGroup.position.x, this.meshGroup.position.z);
        }
    }

    returnToBase() {
        this.isCarried = false;
        this.carrier = null;
        this.meshGroup.position.copy(this.spawnPos);
        this.meshGroup.scale.set(1, 1, 1);
    }
}
window.Flag = Flag;
