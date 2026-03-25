class Bot {
    constructor(scene, shootablesArray) {
        this.scene = scene;
        this.shootables = shootablesArray;
        this.meshGroup = new THREE.Group();
        this.isActive = true;
        this.health = 100;
        this.teamColor = 0xff3333; // Default red team

        // Target tracking
        this.target = null;
        this.moveTimer = 0;
        this.moveDir = new THREE.Vector3();
        this.speed = 3.5;
        this.velocity = new THREE.Vector3();
        this.shootTimer = 0;

        // Mats
        this.mats = {
            body: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }),
            paint: new THREE.MeshStandardMaterial({ color: this.teamColor, roughness: 0.5 }),
            head: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
            paintball: new THREE.MeshBasicMaterial({ color: this.teamColor })
        };

        this.buildMesh();

        // Spawn at random location
        this.meshGroup.position.set(
            (Math.random() - 0.5) * 40,
            0,
            (Math.random() - 0.5) * 40
        );
        this.scene.add(this.meshGroup);

        // Add to shootables so player can shoot them
        this.shootables.push(this.mesh);

        // Raycaster for ground detection
        this.raycaster = new THREE.Raycaster();
        this.downVec = new THREE.Vector3(0, -1, 0);
    }

    buildMesh() {
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), this.mats.body);
        torso.position.y = 1.0;
        torso.castShadow = true;

        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.32), this.mats.paint);
        vest.userData = { isBody: true, score: 100 };
        torso.add(vest);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), this.mats.head);
        head.position.y = 0.4;
        head.userData = { isHeadshot: true, score: 250 };
        head.castShadow = true;

        const mask = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        mask.position.set(0, 0, 0.15);
        head.add(mask);

        torso.add(head);

        const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.4), this.mats.body);
        gun.position.set(0.15, -0.1, 0.3);
        torso.add(gun);

        // Store meshes for hit detection
        this.mesh = torso;
        this.headMesh = head;
        this.mesh.userData = { isTarget: true, entity: this };
        this.headMesh.userData = { isTarget: true, isHeadshot: true, entity: this };

        this.meshGroup.add(torso);
    }

    setColor(hexColor) {
        this.teamColor = hexColor;
        this.mats.paint.color.setHex(hexColor);
        this.mats.paintball.color.setHex(hexColor);
    }

    takeDamage(amount) {
        if (!this.isActive) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isActive = false;
        // Death animation
        this.meshGroup.rotation.x = -Math.PI / 2;
        this.meshGroup.position.y += 0.2;

        // Remove from shootables
        const index = this.shootables.indexOf(this.mesh);
        if (index > -1) this.shootables.splice(index, 1);

        // Respawn after 5 seconds
        setTimeout(() => this.respawn(), 5000);
    }

    respawn() {
        this.health = 100;
        this.isActive = true;
        this.meshGroup.rotation.x = 0;
        this.meshGroup.position.set(
            (Math.random() - 0.5) * 60,
            10, // Drop from sky
            (Math.random() - 0.5) * 60
        );
        this.shootables.push(this.mesh);
    }

    update(delta, playerPos) {
        if (!this.isActive) return;

        // Terrain adaptation
        this.raycaster.set(new THREE.Vector3(this.meshGroup.position.x, this.meshGroup.position.y + 2, this.meshGroup.position.z), this.downVec);
        const groundHits = this.raycaster.intersectObjects(this.shootables, false);
        let targetY = 0;
        if (groundHits.length > 0) {
            targetY = groundHits[0].point.y;
        } else if (window.getTerrainHeight) {
            targetY = window.getTerrainHeight(this.meshGroup.position.x, -this.meshGroup.position.z);
        }

        this.velocity.y -= 9.8 * delta; // Gravity
        this.meshGroup.position.y += this.velocity.y * delta;

        if (this.meshGroup.position.y <= targetY) {
            this.meshGroup.position.y = targetY;
            this.velocity.y = 0;
        }

        // AI Logic
        const distToPlayer = this.meshGroup.position.distanceTo(playerPos);

        // Face player
        const targetLook = new THREE.Vector3(playerPos.x, this.meshGroup.position.y, playerPos.z);
        this.meshGroup.lookAt(targetLook);

        // Movement
        this.moveTimer -= delta;
        if (this.moveTimer <= 0) {
            this.moveTimer = 1 + Math.random() * 2;
            if (distToPlayer > 15) {
                // Move towards player
                this.moveDir.subVectors(playerPos, this.meshGroup.position).normalize();
            } else if (distToPlayer < 8) {
                // Back away
                this.moveDir.subVectors(this.meshGroup.position, playerPos).normalize();
            } else {
                // Strafe
                this.moveDir.set((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
            }
        }

        // Move horizontal
        this.meshGroup.position.addScaledVector(this.moveDir, this.speed * delta);

        // Restrict to arena bounds
        const bounds = 80;
        if (this.meshGroup.position.x > bounds) this.meshGroup.position.x = bounds;
        if (this.meshGroup.position.x < -bounds) this.meshGroup.position.x = -bounds;
        if (this.meshGroup.position.z > bounds) this.meshGroup.position.z = bounds;
        if (this.meshGroup.position.z < -bounds) this.meshGroup.position.z = -bounds;

        // Shooting
        if (distToPlayer < 40) {
            this.shootTimer -= delta;
            if (this.shootTimer <= 0) {
                this.shootTimer = 0.5 + Math.random() * 1.5;
                this.fireAt(playerPos);
            }
        }
    }

    fireAt(targetPos) {
        if (!window.AppProjectileManager) return;

        // Calculate direction with slight inaccuracy
        const inaccuracy = 0.05;
        const targetPt = targetPos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * inaccuracy,
            1.0 + (Math.random() - 0.5) * inaccuracy, // Aim at chest height
            (Math.random() - 0.5) * inaccuracy
        ));

        const startPos = this.meshGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        // Transform local offset (0.15, -0.1, 0.3) to world
        const gunOffset = new THREE.Vector3(0.15, -0.1, 0.3);
        gunOffset.applyQuaternion(this.meshGroup.quaternion);
        startPos.add(gunOffset);

        const dir = new THREE.Vector3().subVectors(targetPt, startPos).normalize();

        window.AppProjectileManager.fire(
            startPos,
            dir,
            2.0, // Velocity mag
            new THREE.Vector3(), // Bot velocity
            this.teamColor,
            this.mats.paintball
        );

        // Play sound if possible
        if (window.AppGameManagerInstance && window.AppGameManagerInstance.audioCtx) {
            const actx = window.AppGameManagerInstance.audioCtx;
            if (actx.state === 'running') {
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, actx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.05, actx.currentTime); // Lower volume than player
                gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
                osc.start(actx.currentTime);
                osc.stop(actx.currentTime + 0.1);
            }
        }
    }
}

window.Bot = Bot;
