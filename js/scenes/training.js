class TrainingScene {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.player = null;
        this.projectileManager = null;
        this.shootables = [];
        this.bots = [];
        this.bottles = [];
        this.dummyGrp = null;
        this.dummyReaction = 0;

        this.clock = new THREE.Clock();
        this.animationFrameId = null;
    }

    init(container) {
        this.container = container;
        this.buildUI();

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#334155');
        this.scene.fog = new THREE.FogExp2('#334155', 0.015);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.buildEnvironment();

        // Player & Managers
        this.player = new window.Player(this.scene, this.camera);
        if (window.Store && window.Store.state && window.Store.state.playerColor) {
            this.player.setColor(window.Store.state.playerColor);
        }

        const raycaster = new THREE.Raycaster();
        this.projectileManager = new window.ProjectileManager(this.scene, raycaster, this.shootables);

        // Global References
        window.AppProjectileManager = this.projectileManager;
        window.AppBots = this.bots;

        // Spawn Bots
        if (window.Bot) {
            for(let i=0; i<3; i++) {
                const b = new window.Bot(this.scene, this.shootables);
                this.bots.push(b);
            }
        }
        window.AppGameManagerInstance = this.gameManager;
        window.getTerrainHeight = () => 0; // Flat floor

        // Global UI callbacks
        window.updateCamModeUI = (isTPS) => {
            const el = document.getElementById('cam-mode');
            if (el) {
                el.innerText = isTPS ? "3ª Pessoa (TPS)" : "1ª Pessoa (FPS)";
                el.style.color = isTPS ? "#fbbf24" : "#10b981";
            }
        };

        window.updateScoreUI = (score) => {
            const el = document.getElementById('score-display');
            if (el) el.innerText = "PONTUAÇÃO: " + score;
        };

        window.triggerHitMarker = (isHead) => {
            const hmUI = document.getElementById('hit-marker');
            if(hmUI) {
                hmUI.classList.remove('active', 'headshot');
                void hmUI.offsetWidth;
                if(isHead) hmUI.classList.add('headshot');
                hmUI.classList.add('active');
                setTimeout(() => hmUI.classList.remove('active'), 150);
            }
        };

        this.setupLockControls();

        this.gameManager.startMatch();
        this.clock.start();
        this.animate();

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    buildUI() {
        this.container.innerHTML = `
        <div id="blocker" style="position: absolute; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.85); display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; z-index: 50; backdrop-filter: blur(8px);">
            <div id="start-menu" style="text-align: center; background: rgba(30, 41, 59, 0.95); padding: 40px; border-radius: 12px; border: 2px solid #ff007f; box-shadow: 0 15px 50px rgba(0,0,0,0.6); max-width: 480px;">
                <h1 style="color: #ff007f; margin-top: 0; text-transform: uppercase; letter-spacing: 3px; font-size: 2.2rem; text-shadow: 0 0 10px rgba(255, 0, 127, 0.4);">Arena de Treino</h1>
                <p style="color: #cbd5e1; line-height: 1.7; margin-bottom: 20px; font-size: 1.1rem;">
                    Melhore sua precisão.<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">W A S D</span> Movimentar-se<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">MOUSE</span> Mirar e Atirar<br>
                </p>
                <button id="btn-enter" style="background: #ff007f; color: white; border: none; padding: 16px 35px; font-size: 1.3rem; font-weight: 900; text-transform: uppercase; cursor: pointer; border-radius: 6px;">Iniciar Treino</button>
            </div>
        </div>

        <div id="ui-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; z-index: 10;">
            <div id="hud-top" style="padding: 25px; text-align: center;"><p id="score-display" style="font-size: 2.8rem; font-weight: 900; color: #fbbf24; text-shadow: 2px 3px 0px #000; margin: 0;">PONTUAÇÃO: 0</p></div>
            <div id="center-ui" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center;">
                <div id="crosshair" style="width: 4px; height: 4px; background-color: rgba(255, 255, 255, 0.9); border-radius: 50%; position: relative; box-shadow: 0 0 4px rgba(0,0,0,0.8);">
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 2px; height: 8px; top: -14px; left: 1px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 2px; height: 8px; bottom: -14px; left: 1px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 8px; height: 2px; top: 1px; left: -14px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 8px; height: 2px; top: 1px; right: -14px;"></div>
                </div>
                <div id="hit-marker" style="position: absolute; width: 32px; height: 32px; opacity: 0; background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Cpath d=\\'M10 10 L40 40 M90 10 L60 40 M10 90 L40 60 M90 90 L60 60\\' stroke=\\'white\\' stroke-width=\\'10\\' stroke-linecap=\\'round\\'/%3E%3C/svg%3E'); background-size: cover; transition: transform 0.1s;"></div>
            </div>
            <div id="hud-bottom-left" style="position: absolute; bottom: 30px; left: 30px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.6); padding: 15px 20px; border-radius: 8px; border: 1px solid #444; text-shadow: 1px 1px 0 #000; backdrop-filter: blur(5px);">Modo: <span id="cam-mode" style="color:#10b981;">1ª Pessoa (FPS)</span></div>
        </div>`;
    }

    setupLighting() {
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 1.5);
        spotLight.position.set(0, 50, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
    }

    buildEnvironment() {
        const mats = {
            floor: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 }),
            wood: new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 }),
            glass: new THREE.MeshStandardMaterial({ color: '#a5f3fc', transparent: true, opacity: 0.5, roughness: 0.1 }),
            target: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), // simplified target
            dummySkin: new THREE.MeshStandardMaterial({ color: '#fca5a5' }),
            dummyShirt: new THREE.MeshStandardMaterial({ color: '#1e3a8a' }),
            dummyPants: new THREE.MeshStandardMaterial({ color: '#111827' }),
        };

        // Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mats.floor);
        floor.rotation.x = -Math.PI/2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.shootables.push(floor);

        // --- ZONA 1: Alvos ---
        const targetGeos = [
            {x: 12, z: -20, s: 1.2, p: 50},
            {x: 25, z: -35, s: 1.8, p: 100},
            {x: 15, z: -60, s: 2.5, p: 200}
        ];

        targetGeos.forEach(t => {
            const stand = new THREE.Group();

            const legGeo = new THREE.BoxGeometry(0.2, 3, 0.2);
            const legL = new THREE.Mesh(legGeo, mats.wood); legL.position.set(-0.6, 1.5, 0); legL.castShadow = true;
            const legR = new THREE.Mesh(legGeo, mats.wood); legR.position.set(0.6, 1.5, 0); legR.castShadow = true;

            const board = new THREE.Mesh(new THREE.CylinderGeometry(t.s/2, t.s/2, 0.1, 32), mats.target);
            board.rotation.x = Math.PI/2;
            board.position.set(0, 3, 0.06);
            board.castShadow = true;
            board.userData = { isTarget: true, score: t.p };

            stand.add(legL, legR, board);
            this.shootables.push(legL, legR, board);

            stand.position.set(t.x, 0, t.z);
            stand.lookAt(0, 0, 0);
            this.scene.add(stand);
        });

        // --- ZONA 2: Mesa com Garrafas ---
        const table = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 2).translate(0, 0.6, 0), mats.wood);
        table.position.set(-15, 0, -15); table.castShadow = true; table.receiveShadow = true;
        table.lookAt(0, 0, 0);
        this.scene.add(table); this.shootables.push(table);

        for(let i=0; i<6; i++) {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 16).translate(0, 0.3, 0), mats.glass.clone());
            const offset = -3 + i*1.2;
            b.position.copy(table.position);
            b.position.y += 1.2;
            b.position.x += Math.cos(table.rotation.y)*offset;
            b.position.z -= Math.sin(table.rotation.y)*offset;

            b.castShadow = true;
            b.userData.isBottle = true;
            this.scene.add(b); this.shootables.push(b);

            this.bottles.push({ mesh: b, vel: new THREE.Vector3(), rot: new THREE.Vector3(), active: true, startPos: b.position.clone() });
        }

        // --- ZONA 3: Boneco (Dummy) ---
        this.dummyGrp = new THREE.Group();
        const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.3).translate(0, 1.25, 0), mats.dummyShirt); dBody.castShadow=true; this.dummyGrp.add(dBody);
        const dLegs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.2).translate(0, 0.4, 0), mats.dummyPants); dLegs.castShadow=true; this.dummyGrp.add(dLegs);
        const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35).translate(0, 1.9, 0), mats.dummySkin); dHead.castShadow=true; this.dummyGrp.add(dHead);

        dBody.userData = { isBody: true }; dHead.userData = { isHeadshot: true };
        this.shootables.push(dBody, dHead);

        this.dummyGrp.position.set(0, 0, -25);
        this.scene.add(this.dummyGrp);
    }

    setupLockControls() {
        this.onBtnEnter = () => { document.body.requestPointerLock(); };
        document.getElementById('btn-enter').addEventListener('click', this.onBtnEnter);

        this.onLockChange = () => {
            const isLocked = document.pointerLockElement === document.body;
            if (this.player) this.player.isLocked = isLocked;
            const blocker = document.getElementById('blocker');
            if(blocker) blocker.style.display = isLocked ? 'none' : 'flex';
        };
        document.addEventListener('pointerlockchange', this.onLockChange);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const time = Date.now() * 0.001;

        if (this.player) this.player.update(delta, time);
        if (this.projectileManager) this.projectileManager.update(delta);
        if (this.player && this.bots) {
            this.bots.forEach(b => b.update(delta, this.player.yawObject.position));
        }

        // Dummy Reaction
        if (this.dummyReaction > 0) {
            this.dummyGrp.rotation.x = -0.2;
            this.dummyReaction--;
        } else {
            this.dummyGrp.rotation.x = 0;
        }

        // Bottles Physics
        this.bottles.forEach(b => {
            if(b.active) {
                b.mesh.position.add(b.vel);
                b.mesh.rotation.x += b.rot.x;
                b.mesh.rotation.z += b.rot.z;
                b.vel.y -= 0.015;

                // Table Collision
                if(b.mesh.position.y < 1.2 && Math.abs(b.mesh.position.x - (-15)) < 4 && Math.abs(b.mesh.position.z - (-15)) < 1) {
                    b.mesh.position.y = 1.2;
                    b.vel.y *= -0.3;
                    b.vel.x *= 0.8; b.vel.z *= 0.8;
                    b.rot.multiplyScalar(0.8);
                }

                // Floor Collision / Respawn
                if(b.mesh.position.y < 0) {
                    b.mesh.position.y = -5;
                    if(b.vel.lengthSq() < 0.01) {
                        setTimeout(() => {
                            b.mesh.position.copy(b.startPos);
                            b.vel.set(0,0,0); b.rot.set(0,0,0);
                            b.mesh.material.color.setHex(0xa5f3fc);
                        }, 2000);
                        b.vel.set(0,0.1,0);
                    }
                }
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        document.removeEventListener('pointerlockchange', this.onLockChange);
        window.removeEventListener('resize', this.onWindowResize);

        if (this.player) this.player.cleanup();

        if (this.renderer) {
            this.container.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }

        window.AppProjectileManager = null;
        window.AppGameManagerInstance = null;
        window.updateCamModeUI = null;
        window.updateScoreUI = null;
        window.triggerHitMarker = null;

        this.container.innerHTML = '';
    }
}

window.TrainingScene = TrainingScene;
