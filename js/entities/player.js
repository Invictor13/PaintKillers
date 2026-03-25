class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.isLocked = false;
        this.isTPS = false;

        this.moveState = { f: false, b: false, l: false, r: false };
        this.canJump = false;
        this.velocity = new THREE.Vector3();

        // Group setup
        this.yawObject = new THREE.Group();
        this.pitchObject = new THREE.Group();
        this.yawObject.position.set(0, 1.6, 10);
        this.scene.add(this.yawObject);
        this.yawObject.add(this.pitchObject);
        this.pitchObject.add(this.camera);

        this.mats = {
            markerBody: new THREE.MeshStandardMaterial({ color: '#ff007f', metalness: 0.6, roughness: 0.3 }),
            markerParts: new THREE.MeshStandardMaterial({ color: '#111111' }),
            paintball: new THREE.MeshBasicMaterial({ color: '#ff007f' })
        };

        this.fpsWeaponGrp = new THREE.Group();
        this.tpsPlayerGrp = new THREE.Group();
        this.recoilActive = 0;

        // Extended materials for the full player model
        this.mats = {
            skin: new THREE.MeshStandardMaterial({ color: '#f1c27d', flatShading: true, roughness: 0.5 }),
            jersey: new THREE.MeshStandardMaterial({ color: '#ff007f', flatShading: true, roughness: 0.8 }),
            pants: new THREE.MeshStandardMaterial({ color: '#111111', flatShading: true, roughness: 0.9 }),
            gear: new THREE.MeshStandardMaterial({ color: '#222222', flatShading: true, roughness: 0.7 }),
            lens: new THREE.MeshStandardMaterial({ color: '#dfff00', flatShading: true, roughness: 0.1, metalness: 0.8 }),
            hair: new THREE.MeshStandardMaterial({ color: '#111111', flatShading: true, roughness: 0.8 }),
            markerBody: new THREE.MeshStandardMaterial({ color: '#00f3ff', flatShading: true, metalness: 0.5, roughness: 0.4 }),
            markerParts: new THREE.MeshStandardMaterial({ color: '#111111', flatShading: true, roughness: 0.6 }),
            paintball: new THREE.MeshBasicMaterial({ color: '#00f3ff' })
        };

        this.buildWeapons();
        this.setupInputs();
    }

    buildWeapons() {
        const isFemale = (window.Store && window.Store.state.playerModel === 'feminino');

        // ==== FPS WEAPON (First Person View) ====
        const fBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.35), this.mats.markerBody);
        const fBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4).rotateX(Math.PI/2), this.mats.markerParts);
        fBarrel.position.set(0, 0.03, -0.35);
        const fHop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), this.mats.markerParts);
        fHop.scale.set(0.8, 1, 1.2); fHop.position.set(0, 0.15, -0.05);
        const fTank = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2).rotateX(Math.PI/2), this.mats.markerParts);
        fTank.position.set(0, -0.05, 0.25);

        this.fpsWeaponGrp.add(fBody, fBarrel, fHop, fTank);
        this.fpsWeaponGrp.position.set(0.2, -0.2, -0.6);
        this.pitchObject.add(this.fpsWeaponGrp);

        // ==== TPS WEAPON & BODY (Third Person View) ====
        // Use the proper models based on gender.
        // We will build a simplified static model for TPS since full IK animation
        // across the network/singleplayer requires an animation loop which is complex.

        const shoulderLocal = new THREE.Vector3(0, 1.45, 0);

        if (isFemale) {
            // Female Torso
            const torsoUpperLen = 0.3;
            const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, torsoUpperLen, 12).translate(0, -torsoUpperLen/2, 0), this.mats.jersey);
            chest.position.copy(shoulderLocal);
            const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 0.25, 12).translate(0, -0.125, 0), this.mats.pants);
            pelvis.position.y = -torsoUpperLen;
            chest.add(pelvis);
            this.tpsPlayerGrp.add(chest);

            // Female Head & Mask
            const headGrp = new THREE.Group();
            headGrp.position.copy(shoulderLocal); headGrp.position.y += 0.05;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.15), this.mats.skin); head.position.y = 0.09; headGrp.add(head);
            const hair = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.16), this.mats.hair); hair.position.y = 0.18; headGrp.add(hair);
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.3, 8).translate(0,-0.15,0), this.mats.hair); tail.position.set(0,0.18,-0.08); tail.rotation.x=0.2; headGrp.add(tail);
            const mask = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), this.mats.gear); mask.position.set(0,0.08,0.09); headGrp.add(mask);
            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.04), this.mats.lens); lens.position.set(0,0.11,0.14); headGrp.add(lens);
            this.tpsPlayerGrp.add(headGrp);

            // Legs
            const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.96, 8).translate(0, -0.48, 0);
            const legL = new THREE.Mesh(legGeo, this.mats.pants); legL.position.set(-0.11, 0.9, 0); this.tpsPlayerGrp.add(legL);
            const legR = new THREE.Mesh(legGeo, this.mats.pants); legR.position.set(0.11, 0.9, 0); this.tpsPlayerGrp.add(legR);

            // Arms (Static holding pose)
            const armGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.65, 8).translate(0, -0.325, 0);
            const armL = new THREE.Mesh(armGeo, this.mats.jersey); armL.position.set(-0.16, 1.45, 0); armL.rotation.x = 0.5; this.tpsPlayerGrp.add(armL);
            const armR = new THREE.Mesh(armGeo, this.mats.jersey); armR.position.set(0.16, 1.45, 0); armR.rotation.x = 0.5; this.tpsPlayerGrp.add(armR);
        } else {
            // Male Torso
            const torsoLen = 0.55;
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, torsoLen, 0.2).translate(0, -torsoLen/2, 0), this.mats.jersey);
            torso.position.copy(shoulderLocal);
            this.tpsPlayerGrp.add(torso);

            // Male Head & Mask
            const headGrp = new THREE.Group();
            headGrp.position.copy(shoulderLocal); headGrp.position.y += 0.05;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), this.mats.gear); head.position.y = 0.1; headGrp.add(head);
            const mask = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.12), this.mats.gear); mask.position.set(0,0.1,0.09); headGrp.add(mask);
            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.07, 0.04), this.mats.lens); lens.position.set(0,0.13,0.14); headGrp.add(lens);
            this.tpsPlayerGrp.add(headGrp);

            // Legs
            const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.9, 8).translate(0, -0.45, 0);
            const legL = new THREE.Mesh(legGeo, this.mats.pants); legL.position.set(-0.15, 0.9, 0); this.tpsPlayerGrp.add(legL);
            const legR = new THREE.Mesh(legGeo, this.mats.pants); legR.position.set(0.15, 0.9, 0); this.tpsPlayerGrp.add(legR);

            // Arms
            const armGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.7, 8).translate(0, -0.35, 0);
            const armL = new THREE.Mesh(armGeo, this.mats.jersey); armL.position.set(-0.22, 1.45, 0); armL.rotation.x = 0.5; this.tpsPlayerGrp.add(armL);
            const armR = new THREE.Mesh(armGeo, this.mats.jersey); armR.position.set(0.22, 1.45, 0); armR.rotation.x = 0.5; this.tpsPlayerGrp.add(armR);
        }

        // Attach TPS Weapon to right side
        const tpsWeapon = this.fpsWeaponGrp.clone();
        tpsWeapon.position.set(0.18, 0.9, 0.3); // Positioned near hip/hands
        this.tpsPlayerGrp.add(tpsWeapon);

        this.scene.add(this.tpsPlayerGrp);
        this.tpsPlayerGrp.visible = false;
    }

    setupInputs() {
        // Pointer Lock binding
        this.onMouseMove = (e) => {
            if (!this.isLocked) return;
            const sensitivity = 0.002;
            this.yawObject.rotation.y -= e.movementX * sensitivity;
            this.pitchObject.rotation.x -= e.movementY * sensitivity;
            this.pitchObject.rotation.x = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, this.pitchObject.rotation.x));
        };
        document.addEventListener('mousemove', this.onMouseMove);

        this.onKeyDown = (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.f = true; break;
                case 'KeyA': this.moveState.l = true; break;
                case 'KeyS': this.moveState.b = true; break;
                case 'KeyD': this.moveState.r = true; break;
                case 'Space': if(this.canJump) { this.velocity.y += 8; this.canJump = false; } break;
                case 'KeyV':
                    if(this.isLocked) {
                        this.isTPS = !this.isTPS;
                        // Dispatch event for UI
                        if (window.updateCamModeUI) window.updateCamModeUI(this.isTPS);
                    } break;
            }
        };
        document.addEventListener('keydown', this.onKeyDown);

        this.onKeyUp = (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.f = false; break;
                case 'KeyA': this.moveState.l = false; break;
                case 'KeyS': this.moveState.b = false; break;
                case 'KeyD': this.moveState.r = false; break;
            }
        };
        document.addEventListener('keyup', this.onKeyUp);

        this.onMouseDown = (e) => {
            if (!this.isLocked || e.button !== 0) return;
            this.recoilActive = 0.08;

            // Fire projectile if manager exists
            if (window.AppProjectileManager) {
                const startPos = new THREE.Vector3();
                this.camera.getWorldPosition(startPos);

                const shootDir = new THREE.Vector3();
                this.camera.getWorldDirection(shootDir);

                window.AppProjectileManager.fire(
                    startPos,
                    shootDir,
                    2.5, // velocity
                    this.velocity,
                    this.mats.paintball.color.getHex(),
                    this.mats.paintball
                );
            }
        };
        document.addEventListener('mousedown', this.onMouseDown);
    }

    setColor(colorHex) {
        this.mats.markerBody.color.set(colorHex);
        this.mats.paintball.color.set(colorHex);
    }

    cleanup() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousedown', this.onMouseDown);
    }

    update(delta, time) {
        if (this.isLocked) {
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;
            this.velocity.y -= 25.0 * delta;

            const moveZ = Number(this.moveState.f) - Number(this.moveState.b);
            const moveX = Number(this.moveState.r) - Number(this.moveState.l);

            const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.yawObject.quaternion).normalize();
            const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(this.yawObject.quaternion).normalize();

            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(fwd, moveZ);
            moveVector.addScaledVector(rgt, moveX);

            if(moveVector.lengthSq() > 0) moveVector.normalize();

            const spd = 40.0;
            this.velocity.x += moveVector.x * spd * delta;
            this.velocity.z += moveVector.z * spd * delta;

            this.yawObject.position.x += this.velocity.x * delta;
            this.yawObject.position.z += this.velocity.z * delta;
            this.yawObject.position.y += this.velocity.y * delta;

            const floorY = window.getTerrainHeight ? window.getTerrainHeight(this.yawObject.position.x, this.yawObject.position.z) : 0;
            const playerHeight = floorY + 1.6;

            if(this.yawObject.position.y < playerHeight) {
                this.velocity.y = 0;
                this.yawObject.position.y = playerHeight;
                this.canJump = true;
            }
        }

        // Camera Transition
        if (this.isTPS) {
            this.camera.position.lerp(new THREE.Vector3(0.6, 0.5, 3.5), 0.2);
            this.fpsWeaponGrp.visible = false;
            this.tpsPlayerGrp.visible = true;
        } else {
            this.camera.position.lerp(new THREE.Vector3(0, 0, 0), 0.3);
            this.fpsWeaponGrp.visible = true;
            this.tpsPlayerGrp.visible = false;
        }

        this.tpsPlayerGrp.position.copy(this.yawObject.position);
        this.tpsPlayerGrp.position.y -= 1.6;
        this.tpsPlayerGrp.rotation.y = THREE.MathUtils.lerp(this.tpsPlayerGrp.rotation.y, this.yawObject.rotation.y, 0.2);

        // Recoil
        if (this.recoilActive > 0) {
            this.fpsWeaponGrp.position.z = -0.6 + (this.recoilActive * 1.5);
            this.fpsWeaponGrp.rotation.x = this.recoilActive * 1.5;
            this.recoilActive -= delta * 0.8;
        } else {
            this.fpsWeaponGrp.position.z = -0.6;
            this.fpsWeaponGrp.rotation.x = 0;
        }

        // Bobbing
        const speed = Math.sqrt(this.velocity.x**2 + this.velocity.z**2);
        if(speed > 0.5 && this.canJump) {
            const bob = Math.sin(time * 12) * 0.02;
            this.fpsWeaponGrp.position.y = -0.2 + Math.abs(bob);
            this.fpsWeaponGrp.position.x = 0.2 + bob;
        } else {
            this.fpsWeaponGrp.position.y = -0.2;
            this.fpsWeaponGrp.position.x = 0.2;
        }
    }
}

window.Player = Player;
