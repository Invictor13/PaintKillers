class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.isLocked = false;
        this.isTPS = false;

        this.moveState = { f: false, b: false, l: false, r: false, sprint: false, crouch: false };
        this.canJump = false;
        this.velocity = new THREE.Vector3();

        // Group setup
        this.yawObject = new THREE.Group();
        this.pitchObject = new THREE.Group();
        this.yawObject.position.set(0, 1.6, 10);
        this.scene.add(this.yawObject);
        this.yawObject.add(this.pitchObject);
        this.pitchObject.add(this.camera);

        this.fpsWeaponGrp = new THREE.Group();
        this.tpsPlayerGrp = new THREE.Group();
        this.recoilActive = 0;

        // Configs for rendering the model
        this.config = {
            mask: 'tactical', marker: 'speedball', pack: 'podpack', clothing: 'jersey'
        };

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

        // TPS Animation State
        this.animated = {
            pBodyGroup: new THREE.Group(), pHeadGroup: new THREE.Group(),
            pLimbsGroup: new THREE.Group(), pMarkerGroup: new THREE.Group(),
            leftArm: null, rightArm: null, leftLeg: null, rightLeg: null,
            hairTail: null, hipL: new THREE.Vector3(), hipR: new THREE.Vector3(),
            baseHandR: new THREE.Vector3(), baseHandL: new THREE.Vector3(),
            baseFootL: new THREE.Vector3(), baseFootR: new THREE.Vector3(),
            currentHandL: new THREE.Vector3(), currentHandR: new THREE.Vector3(),
            currentFootL: new THREE.Vector3(), currentFootR: new THREE.Vector3(),
            currentBodyY: 0, currentBodyRotX: 0
        };

        this.PROPS = { armUpperLen: 0.35, armLowerLen: 0.35, thighLen: 0.45, calfLen: 0.45 };

        this.buildWeapons();
        this.setupInputs();
    }

    // --- IK HELPER FUNCTIONS ---
    createLimb(rTop, rBot, length, mat, parentGroup) {
        const geo = new THREE.CylinderGeometry(rTop, rBot, length, 8);
        geo.translate(0, -length / 2, 0);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        parentGroup.add(mesh);
        return mesh;
    }

    orientLimb(mesh, startPos, endPos) {
        mesh.position.copy(startPos);
        const dir = new THREE.Vector3().subVectors(endPos, startPos);
        if (dir.lengthSq() < 0.0001) return;
        dir.normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    }

    solveIK(startPos, targetPos, len1, len2, bendDir) {
        const dir = new THREE.Vector3().subVectors(targetPos, startPos);
        const maxReach = len1 + len2 - 0.001;
        let dist = dir.length();
        if (dist > maxReach) { dist = maxReach; dir.normalize().multiplyScalar(maxReach); }
        const normalDir = dir.clone().normalize();
        const cosAlpha = (len1*len1 + dist*dist - len2*len2) / (2 * len1 * dist);
        const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
        const d1 = len1 * Math.cos(alpha);
        const basePos = new THREE.Vector3().copy(startPos).add(normalDir.clone().multiplyScalar(d1));
        const h = len1 * Math.sin(alpha);
        const n = new THREE.Vector3().copy(bendDir);
        const projection = normalDir.clone().multiplyScalar(n.dot(normalDir));
        n.sub(projection).normalize();
        return basePos.add(n.multiplyScalar(h));
    }

    // --- WEAPON & MODEL BUILDERS ---
    buildWeapons() {
        const isFemale = (window.Store && window.Store.state && window.Store.state.playerModel === 'feminino');

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

        // ==== TPS PLAYER FULL MODEL ====
        this.tpsPlayerGrp.add(this.animated.pBodyGroup);
        this.tpsPlayerGrp.add(this.animated.pHeadGroup);
        this.tpsPlayerGrp.add(this.animated.pLimbsGroup);
        this.tpsPlayerGrp.add(this.animated.pMarkerGroup);

        const shoulderLocal = new THREE.Vector3(0, 1.45, 0);

        if (isFemale) {
            this.PROPS = { armUpperLen: 0.32, armLowerLen: 0.33, thighLen: 0.48, calfLen: 0.48 };
            this.animated.baseHandR.set(0.15, 1.0, 0.2);
            this.animated.baseHandL.set(-0.15, 1.05, 0.5);
            this.animated.baseFootL.set(-0.15, 0.05, 0.0);
            this.animated.baseFootR.set(0.15, 0.05, 0.0);

            // Female Torso
            const torsoUpperLen = 0.3;
            const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, torsoUpperLen, 12).translate(0, -torsoUpperLen/2, 0), this.mats.jersey);
            chest.position.copy(shoulderLocal); chest.castShadow = true;
            this.animated.pBodyGroup.add(chest);

            const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 12), this.mats.gear);
            belt.position.y = -torsoUpperLen; chest.add(belt);

            const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 0.25, 12).translate(0, -0.125, 0), this.mats.pants);
            pelvis.position.y = -torsoUpperLen; chest.add(pelvis);

            // Head
            this.animated.pHeadGroup.position.copy(shoulderLocal); this.animated.pHeadGroup.position.y += 0.05;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.15), this.mats.skin); head.position.y = 0.09; this.animated.pHeadGroup.add(head);
            const hair = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.16), this.mats.hair); hair.position.y = 0.18; this.animated.pHeadGroup.add(hair);

            // Ponytail
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.3, 8).translate(0,-0.15,0), this.mats.hair);
            tail.position.set(0,0.18,-0.08); tail.rotation.x=0.2; this.animated.pHeadGroup.add(tail);
            this.animated.hairTail = tail;

            // Mask
            const maskGrp = new THREE.Group(); maskGrp.position.set(0, 0.08, 0.04);
            maskGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12).translate(0,0,0.05), this.mats.gear));
            maskGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.04).translate(0,0.03,0.1), this.mats.lens));
            this.animated.pHeadGroup.add(maskGrp);

            // Limbs
            const thighL = this.createLimb(0.08, 0.06, this.PROPS.thighLen, this.mats.pants, this.animated.pLimbsGroup);
            const calfL = this.createLimb(0.06, 0.04, this.PROPS.calfLen, this.mats.pants, this.animated.pLimbsGroup);
            const thighR = this.createLimb(0.08, 0.06, this.PROPS.thighLen, this.mats.pants, this.animated.pLimbsGroup);
            const calfR = this.createLimb(0.06, 0.04, this.PROPS.calfLen, this.mats.pants, this.animated.pLimbsGroup);
            const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18).translate(0,-0.04,0.04), this.mats.gear); shoeL.position.y = -this.PROPS.calfLen; calfL.add(shoeL);
            const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18).translate(0,-0.04,0.04), this.mats.gear); shoeR.position.y = -this.PROPS.calfLen; calfR.add(shoeR);

            this.animated.leftLeg = { up: thighL, low: calfL }; this.animated.rightLeg = { up: thighR, low: calfR };

            const armL_Up = this.createLimb(0.05, 0.04, this.PROPS.armUpperLen, this.mats.jersey, this.animated.pLimbsGroup);
            const armL_Low = this.createLimb(0.04, 0.03, this.PROPS.armLowerLen, this.mats.jersey, this.animated.pLimbsGroup);
            const armR_Up = this.createLimb(0.05, 0.04, this.PROPS.armUpperLen, this.mats.jersey, this.animated.pLimbsGroup);
            const armR_Low = this.createLimb(0.04, 0.03, this.PROPS.armLowerLen, this.mats.jersey, this.animated.pLimbsGroup);
            const handL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04).translate(0,-0.04,0), this.mats.gear); handL.position.y = -this.PROPS.armLowerLen; armL_Low.add(handL);
            const handR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04).translate(0,-0.04,0), this.mats.gear); handR.position.y = -this.PROPS.armLowerLen; armR_Low.add(handR);

            this.animated.leftArm = { up: armL_Up, low: armL_Low }; this.animated.rightArm = { up: armR_Up, low: armR_Low };
        } else {
            this.PROPS = { armUpperLen: 0.35, armLowerLen: 0.35, thighLen: 0.45, calfLen: 0.45 };
            this.animated.baseHandR.set(0.2, 1.0, 0.2);
            this.animated.baseHandL.set(-0.2, 1.05, 0.5);
            this.animated.baseFootL.set(-0.2, 0.05, 0.0);
            this.animated.baseFootR.set(0.2, 0.05, 0.0);

            // Male Torso
            const torsoLen = 0.55;
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, torsoLen, 0.2).translate(0, -torsoLen/2, 0), this.mats.jersey);
            torso.position.copy(shoulderLocal); torso.castShadow = true;
            this.animated.pBodyGroup.add(torso);

            // Head
            this.animated.pHeadGroup.position.copy(shoulderLocal); this.animated.pHeadGroup.position.y += 0.05;
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), this.mats.gear); head.position.y = 0.1; this.animated.pHeadGroup.add(head);
            const maskGrp = new THREE.Group(); maskGrp.position.set(0, 0.1, 0.04);
            maskGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.12).translate(0,0,0.05), this.mats.gear));
            maskGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.07, 0.04).translate(0,0.03,0.1), this.mats.lens));
            this.animated.pHeadGroup.add(maskGrp);

            // Limbs
            const thighL = this.createLimb(0.09, 0.07, this.PROPS.thighLen, this.mats.pants, this.animated.pLimbsGroup);
            const calfL = this.createLimb(0.07, 0.05, this.PROPS.calfLen, this.mats.pants, this.animated.pLimbsGroup);
            const thighR = this.createLimb(0.09, 0.07, this.PROPS.thighLen, this.mats.pants, this.animated.pLimbsGroup);
            const calfR = this.createLimb(0.07, 0.05, this.PROPS.calfLen, this.mats.pants, this.animated.pLimbsGroup);
            const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.2).translate(0,-0.04,0.04), this.mats.gear); shoeL.position.y = -this.PROPS.calfLen; calfL.add(shoeL);
            const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.2).translate(0,-0.04,0.04), this.mats.gear); shoeR.position.y = -this.PROPS.calfLen; calfR.add(shoeR);

            this.animated.leftLeg = { up: thighL, low: calfL }; this.animated.rightLeg = { up: thighR, low: calfR };

            const armL_Up = this.createLimb(0.06, 0.05, this.PROPS.armUpperLen, this.mats.jersey, this.animated.pLimbsGroup);
            const armL_Low = this.createLimb(0.05, 0.04, this.PROPS.armLowerLen, this.mats.jersey, this.animated.pLimbsGroup);
            const armR_Up = this.createLimb(0.06, 0.05, this.PROPS.armUpperLen, this.mats.jersey, this.animated.pLimbsGroup);
            const armR_Low = this.createLimb(0.05, 0.04, this.PROPS.armLowerLen, this.mats.jersey, this.animated.pLimbsGroup);
            const handL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05).translate(0,-0.04,0), this.mats.gear); handL.position.y = -this.PROPS.armLowerLen; armL_Low.add(handL);
            const handR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05).translate(0,-0.04,0), this.mats.gear); handR.position.y = -this.PROPS.armLowerLen; armR_Low.add(handR);

            this.animated.leftArm = { up: armL_Up, low: armL_Low }; this.animated.rightArm = { up: armR_Up, low: armR_Low };
        }

        // Marker (TPS Weapon) attached to pMarkerGroup
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.25), this.mats.markerBody); body.position.set(0, 0.05, 0.1); this.animated.pMarkerGroup.add(body);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.05), this.mats.gear); grip.position.set(0, -0.05, 0); this.animated.pMarkerGroup.add(grip);
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12).rotateX(Math.PI/2), this.mats.markerParts); tank.position.set(0, -0.1, -0.15); this.animated.pMarkerGroup.add(tank);
        const hopper = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), this.mats.markerParts); hopper.scale.set(0.8, 1, 1.2); hopper.position.set(0, 0.18, 0.08); this.animated.pMarkerGroup.add(hopper);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8).rotateX(Math.PI/2), this.mats.markerParts); barrel.position.set(0, 0.06, 0.325); this.animated.pMarkerGroup.add(barrel);
        this.animated.pMarkerGroup.castShadow = true;

        this.animated.currentHandL.copy(this.animated.baseHandL);
        this.animated.currentHandR.copy(this.animated.baseHandR);
        this.animated.currentFootL.copy(this.animated.baseFootL);
        this.animated.currentFootR.copy(this.animated.baseFootR);

        this.scene.add(this.tpsPlayerGrp);
        this.tpsPlayerGrp.visible = false;
    }

    setupInputs() {
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
                case 'ShiftLeft': this.moveState.sprint = true; break;
                case 'KeyC': this.moveState.crouch = true; break;
                case 'Space': if(this.canJump) { this.velocity.y += 8; this.canJump = false; } break;
                case 'KeyV':
                    if(this.isLocked) {
                        this.isTPS = !this.isTPS;
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
                case 'ShiftLeft': this.moveState.sprint = false; break;
                case 'KeyC': this.moveState.crouch = false; break;
            }
        };
        document.addEventListener('keyup', this.onKeyUp);

        this.onMouseDown = (e) => {
            if (!this.isLocked || e.button !== 0) return;
            this.recoilActive = 0.08;

            if (window.AppProjectileManager) {
                const startPos = new THREE.Vector3();
                this.camera.getWorldPosition(startPos);
                const shootDir = new THREE.Vector3();
                this.camera.getWorldDirection(shootDir);

                window.AppProjectileManager.fire(
                    startPos, shootDir, 2.5, this.velocity,
                    this.mats.paintball.color.getHex(), this.mats.paintball
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
        // --- 1. MOVEMENT PHYSICS ---
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

            const spd = this.moveState.sprint ? 60.0 : (this.moveState.crouch ? 20.0 : 40.0);
            this.velocity.x += moveVector.x * spd * delta;
            this.velocity.z += moveVector.z * spd * delta;

            this.yawObject.position.x += this.velocity.x * delta;
            this.yawObject.position.z += this.velocity.z * delta;
            this.yawObject.position.y += this.velocity.y * delta;

            const floorY = window.getTerrainHeight ? window.getTerrainHeight(this.yawObject.position.x, this.yawObject.position.z) : 0;
            // Target height for camera/head
            const targetHeight = floorY + (this.moveState.crouch ? 0.8 : 1.6);

            // Smoothly interpolate the yaw object to the target height
            if (this.yawObject.position.y < targetHeight) {
                // Ground collision
                this.velocity.y = 0;
                this.yawObject.position.y = targetHeight;
                this.canJump = true;
            } else if (this.canJump && Math.abs(this.yawObject.position.y - targetHeight) > 0.05) {
                // Standing up or crouching while on ground
                this.yawObject.position.y += (targetHeight - this.yawObject.position.y) * 10.0 * delta;
                if (this.yawObject.position.y < floorY + 0.8) this.yawObject.position.y = floorY + 0.8;
            }
        }

        // --- 2. TPS ANIMATION STATE MACHINE ---
        let currentSpeed = Math.sqrt(this.velocity.x**2 + this.velocity.z**2);
        let animState = 'idle';
        if (!this.canJump) animState = 'jump';
        else if (this.moveState.crouch) animState = 'crouch';
        else if (currentSpeed > 8) animState = 'run';
        else if (currentSpeed > 1) animState = 'walk';

        let tBodyY = 0, tBodyRotX = 0, tBodyRotY = 0;
        let tHandR = this.animated.baseHandR.clone();
        let tHandL = new THREE.Vector3();
        let tFootL = this.animated.baseFootL.clone();
        let tFootR = this.animated.baseFootR.clone();

        let wRotX = 0, wRotY = 0;
        let spd = 0;

        switch(animState) {
            case 'idle':
                tBodyY = Math.sin(time * 2) * 0.02;
                tFootL.y -= tBodyY; tFootR.y -= tBodyY;
                tBodyRotY = -0.2;
                tHandR.set(this.animated.baseHandR.x, this.animated.baseHandR.y - 0.05 + Math.sin(time*2)*0.01, this.animated.baseHandR.z);
                wRotX = 0.2; wRotY = 0.1;
                break;
            case 'walk':
                spd = 8;
                tBodyY = Math.abs(Math.sin(time * spd)) * 0.03;
                tFootL.z += Math.sin(time * spd) * 0.25;
                tFootL.y += -tBodyY + Math.max(0, Math.cos(time * spd)) * 0.15;
                tFootR.z += Math.sin(time * spd + Math.PI) * 0.25;
                tFootR.y += -tBodyY + Math.max(0, Math.cos(time * spd + Math.PI)) * 0.15;
                tBodyRotY = -0.3;
                tHandR.set(this.animated.baseHandR.x, this.animated.baseHandR.y + 0.05 + Math.sin(time*spd*2)*0.02, this.animated.baseHandR.z);
                wRotX = 0;
                break;
            case 'run':
                spd = 14;
                tBodyRotX = 0.4;
                tBodyY = -0.1 + Math.abs(Math.sin(time * spd)) * 0.08;
                tFootL.z += Math.sin(time * spd) * 0.5;
                tFootL.y += -tBodyY + Math.max(0, Math.cos(time * spd)) * 0.3;
                tFootR.z += Math.sin(time * spd + Math.PI) * 0.5;
                tFootR.y += -tBodyY + Math.max(0, Math.cos(time * spd + Math.PI)) * 0.3;
                tBodyRotY = 0;
                tHandR.set(this.animated.baseHandR.x, this.animated.baseHandR.y - 0.15, this.animated.baseHandR.z - 0.1 + Math.sin(time*spd)*0.2);
                wRotX = 0.5;
                break;
            case 'jump':
                spd = 5;
                if (this.velocity.y > 0) {
                    tBodyRotX = 0.2; tBodyRotY = 0;
                    tHandR.set(this.animated.baseHandR.x, this.animated.baseHandR.y + 0.2, 0.2);
                    tFootL.set(this.animated.baseFootL.x, 0.2, -0.2);
                    tFootR.set(this.animated.baseFootR.x, 0.4, -0.4);
                } else {
                    tBodyRotX = 0.1; wRotX = -0.1;
                    tHandR.set(this.animated.baseHandR.x, this.animated.baseHandR.y - 0.2, 0.1);
                    tFootL.set(this.animated.baseFootL.x, -0.2, 0.1);
                    tFootR.set(this.animated.baseFootR.x, -0.1, 0.1);
                }
                break;
            case 'crouch':
                tBodyY = -0.6; tBodyRotY = -0.4; tBodyRotX = 0.3;
                tFootL.set(this.animated.baseFootL.x, this.animated.baseFootL.y, 0.3);
                tFootR.set(this.animated.baseFootR.x, this.animated.baseFootR.y, -0.3);
                tHandR.set(this.animated.baseHandR.x, this.animated.baseHandR.y - 0.6, this.animated.baseHandR.z);
                break;
        }

        // Shoot Override
        if (this.recoilActive > 0) {
            tHandR.set(this.animated.baseHandR.x - 0.05, 1.1, 0.3);
            wRotX = 0; tBodyRotY = -0.3;
        }

        let offsetL = new THREE.Vector3(-0.02, 0, 0.25);
        offsetL.applyEuler(new THREE.Euler(wRotX, wRotY + tBodyRotY, 0));
        tHandL.copy(tHandR).add(offsetL);

        this.animated.currentBodyY = THREE.MathUtils.lerp(this.animated.currentBodyY, tBodyY, 0.15);
        this.animated.currentBodyRotX = THREE.MathUtils.lerp(this.animated.currentBodyRotX, tBodyRotX, 0.15);
        this.animated.pBodyGroup.rotation.y = THREE.MathUtils.lerp(this.animated.pBodyGroup.rotation.y, tBodyRotY, 0.15);
        this.animated.currentHandL.lerp(tHandL, 0.2);
        this.animated.currentHandR.lerp(tHandR, 0.2);
        this.animated.currentFootL.lerp(tFootL, 0.3);
        this.animated.currentFootR.lerp(tFootR, 0.3);

        if (this.animated.hairTail) {
            this.animated.hairTail.rotation.x = 0.2 + Math.sin(time * 3) * 0.05 - this.animated.pBodyGroup.rotation.x;
        }

        // Apply transformations
        this.tpsPlayerGrp.position.copy(this.yawObject.position);

        // Ensure feet stay on the floor properly regardless of crouch camera height
        const actualFloorY = window.getTerrainHeight ? window.getTerrainHeight(this.yawObject.position.x, this.yawObject.position.z) : 0;
        this.tpsPlayerGrp.position.y = actualFloorY;

        this.tpsPlayerGrp.rotation.y = this.yawObject.rotation.y + Math.PI;

        this.animated.pBodyGroup.position.y = this.animated.currentBodyY;
        this.animated.pBodyGroup.rotation.x = this.animated.currentBodyRotX;

        let rotX = this.animated.currentBodyRotX;
        let currentBodyRotY = this.animated.pBodyGroup.rotation.y;

        let headY = 1.45 * Math.cos(rotX);
        let headZ = 1.45 * Math.sin(rotX);
        this.animated.pHeadGroup.position.set(0, headY, headZ);
        this.animated.pHeadGroup.rotation.x = rotX * 0.5;
        this.animated.pHeadGroup.rotation.y = -currentBodyRotY;

        // SHOULDERS & HIPS
        let sy = 1.45 * Math.cos(rotX);
        let sz = 1.45 * Math.sin(rotX);
        let sw = (window.Store && window.Store.state.playerModel === 'feminino') ? 0.16 : 0.22;
        let curShoulderL = new THREE.Vector3(-sw, sy, sz).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);
        let curShoulderR = new THREE.Vector3(sw, sy, sz).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);

        let hy = 0.9 * Math.cos(rotX);
        let hz = 0.9 * Math.sin(rotX);
        let hw = (window.Store && window.Store.state.playerModel === 'feminino') ? 0.11 : 0.15;
        let curHipL = new THREE.Vector3(-hw, hy, hz).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);
        let curHipR = new THREE.Vector3(hw, hy, hz).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);

        // IK SOLVERS
        if (this.animated.leftArm && this.animated.rightArm) {
            let elbowDirL = new THREE.Vector3(-1, -0.5, 0).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);
            let elbowDirR = new THREE.Vector3(1, -0.5, 0).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);

            const elbL = this.solveIK(curShoulderL, this.animated.currentHandL, this.PROPS.armUpperLen, this.PROPS.armLowerLen, elbowDirL);
            this.orientLimb(this.animated.leftArm.up, curShoulderL, elbL);
            this.orientLimb(this.animated.leftArm.low, elbL, this.animated.currentHandL);

            const elbR = this.solveIK(curShoulderR, this.animated.currentHandR, this.PROPS.armUpperLen, this.PROPS.armLowerLen, elbowDirR);
            this.orientLimb(this.animated.rightArm.up, curShoulderR, elbR);
            this.orientLimb(this.animated.rightArm.low, elbR, this.animated.currentHandR);
        }

        if (this.animated.leftLeg && this.animated.rightLeg) {
            const kneeDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0,1,0), currentBodyRotY);

            const kneeL = this.solveIK(curHipL, this.animated.currentFootL, this.PROPS.thighLen, this.PROPS.calfLen, kneeDir);
            this.orientLimb(this.animated.leftLeg.up, curHipL, kneeL);
            this.orientLimb(this.animated.leftLeg.low, kneeL, this.animated.currentFootL);

            const kneeR = this.solveIK(curHipR, this.animated.currentFootR, this.PROPS.thighLen, this.PROPS.calfLen, kneeDir);
            this.orientLimb(this.animated.rightLeg.up, curHipR, kneeR);
            this.orientLimb(this.animated.rightLeg.low, kneeR, this.animated.currentFootR);
        }

        // Weapon Orientation
        this.animated.pMarkerGroup.position.copy(this.animated.currentHandR);
        if (this.recoilActive > 0) this.animated.pMarkerGroup.position.z -= Math.sin(time * 40) * 0.03;

        this.animated.pMarkerGroup.rotation.x = THREE.MathUtils.lerp(this.animated.pMarkerGroup.rotation.x, wRotX, 0.2);
        this.animated.pMarkerGroup.rotation.y = currentBodyRotY + wRotY;

        // --- 3. CAMERA & FPS WEAPON ---
        if (this.isTPS) {
            // Camera looks from shoulder
            this.camera.position.lerp(new THREE.Vector3(0.6, 0.5, 3.5), 0.2);
            this.fpsWeaponGrp.visible = false;
            this.tpsPlayerGrp.visible = true;
        } else {
            // First Person mode
            this.camera.position.lerp(new THREE.Vector3(0, 0, 0), 0.3);
            this.fpsWeaponGrp.visible = true;
            this.tpsPlayerGrp.visible = false;
        }

        if (this.recoilActive > 0) {
            this.fpsWeaponGrp.position.z = -0.6 + (this.recoilActive * 1.5);
            this.fpsWeaponGrp.rotation.x = this.recoilActive * 1.5;
            this.recoilActive -= delta * 0.8;
        } else {
            this.fpsWeaponGrp.position.z = -0.6;
            this.fpsWeaponGrp.rotation.x = 0;
        }

        if(currentSpeed > 0.5 && this.canJump) {
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
