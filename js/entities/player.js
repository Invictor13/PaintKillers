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
        this.buildWeapons();

        this.recoilActive = 0;

        this.setupInputs();
    }

    buildWeapons() {
        // FPS Weapon
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

        // TPS Player Dummy
        const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.2).translate(0, 1.1, 0), new THREE.MeshStandardMaterial({color: '#1e3a8a'}));
        const pHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25).translate(0, 1.6, 0), this.mats.markerParts);
        const pLegL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15).translate(-0.12, 0.4, 0), new THREE.MeshStandardMaterial({color: '#111827'}));
        const pLegR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15).translate(0.12, 0.4, 0), new THREE.MeshStandardMaterial({color: '#111827'}));

        const tpsWeapon = this.fpsWeaponGrp.clone();
        tpsWeapon.position.set(0.2, 1.2, -0.3);

        this.tpsPlayerGrp.add(pBody, pHead, pLegL, pLegR, tpsWeapon);
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
