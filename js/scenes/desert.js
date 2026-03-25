class DesertScene {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.player = null;
        this.projectileManager = null;
        this.shootables = [];
        this.clock = new THREE.Clock();

        this.animationFrameId = null;
    }

    init(container) {
        this.container = container;
        this.buildUI();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#d2b48c');
        this.scene.fog = new THREE.FogExp2('#d2b48c', 0.0035);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.buildEnvironment();

        this.player = new window.Player(this.scene, this.camera);
        if (window.Store && window.Store.state && window.Store.state.playerColor) {
            this.player.setColor(window.Store.state.playerColor);
        }

        const raycaster = new THREE.Raycaster();
        this.projectileManager = new window.ProjectileManager(this.scene, raycaster, this.shootables);

        window.AppProjectileManager = this.projectileManager;
        window.AppGameManagerInstance = this.gameManager;
        window.getTerrainHeight = () => 0; // Keeping it flat for gameplay stability in the SPA

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
        <div id="blocker" style="position: absolute; width: 100%; height: 100%; background-color: rgba(28, 25, 23, 0.95); display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; z-index: 50; backdrop-filter: blur(8px);">
            <div id="start-menu" style="text-align: center; background: rgba(0,0,0,0.8); padding: 40px; border-radius: 12px; border: 2px solid #d97706; box-shadow: 0 15px 50px rgba(0,0,0,0.6); max-width: 480px;">
                <h1 style="color: #d97706; margin-top: 0; text-transform: uppercase; letter-spacing: 3px; font-size: 2.2rem;">Deserto Tático</h1>
                <p style="color: #cbd5e1; line-height: 1.7; margin-bottom: 20px; font-size: 1.1rem;">
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">W A S D</span> Movimentar-se<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">ESPAÇO</span> Pular<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">MOUSE</span> Mirar e Atirar<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">V</span> Modo 3ª Pessoa<br>
                </p>
                <button id="btn-enter" style="background: #d97706; color: white; border: none; padding: 16px 35px; font-size: 1.3rem; font-weight: 900; text-transform: uppercase; cursor: pointer; border-radius: 6px;">Entrar na Arena</button>
            </div>
        </div>

        <div id="ui-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; z-index: 10;">
            <div id="hud-top" style="padding: 25px; text-align: center;"><p id="score-display" style="font-size: 2.8rem; font-weight: 900; color: #d97706; text-shadow: 2px 3px 0px #000; margin: 0;">PONTUAÇÃO: 0</p></div>
            <div id="center-ui" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center;">
                <div id="crosshair" style="width: 4px; height: 4px; background-color: rgba(255, 255, 255, 0.9); border-radius: 50%; position: relative; box-shadow: 0 0 4px rgba(0,0,0,0.8);">
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 2px; height: 8px; top: -14px; left: 1px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 2px; height: 8px; bottom: -14px; left: 1px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 8px; height: 2px; top: 1px; left: -14px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 8px; height: 2px; top: 1px; right: -14px;"></div>
                </div>
                <div id="hit-marker" style="position: absolute; width: 32px; height: 32px; opacity: 0; background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Cpath d=\\'M10 10 L40 40 M90 10 L60 40 M10 90 L40 60 M90 90 L60 60\\' stroke=\\'white\\' stroke-width=\\'10\\' stroke-linecap=\\'round\\'/%3E%3C/svg%3E'); background-size: cover; transition: transform 0.1s;"></div>
            </div>
            <div id="hud-bottom-left" style="position: absolute; bottom: 30px; left: 30px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.6); padding: 15px 20px; border-radius: 8px; border: 1px solid #444; text-shadow: 1px 1px 0 #000; backdrop-filter: blur(5px);">Modo: <span id="cam-mode" style="color:#d97706;">1ª Pessoa (FPS)</span></div>
        </div>`;
    }

    setupLighting() {
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x6b4a2d, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.3);
        sunLight.position.set(50, 100, 30);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -60; sunLight.shadow.camera.right = 60;
        sunLight.shadow.camera.top = 60; sunLight.shadow.camera.bottom = -60;
        sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
    }

    buildEnvironment() {
        const mats = {
            sand: new THREE.MeshStandardMaterial({ color: '#d2b48c', roughness: 1.0 }),
            adobe: new THREE.MeshStandardMaterial({ color: '#b38b6d', roughness: 0.9 }),
            cactus: new THREE.MeshStandardMaterial({ color: '#4d632c', roughness: 0.8 }),
        };

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), mats.sand);
        floor.rotation.x = -Math.PI/2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.shootables.push(floor);

        // Cactus
        for(let i=0; i<80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 30 + Math.random() * 60;

            const cactusGrp = new THREE.Group();
            const h = 4 + Math.random()*4;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, h, 8), mats.cactus);
            stem.position.y = h/2; stem.castShadow = true; stem.receiveShadow = true;

            cactusGrp.add(stem);
            cactusGrp.position.set(Math.cos(angle)*radius, 0, Math.sin(angle)*radius);

            this.scene.add(cactusGrp);
            this.shootables.push(stem);
        }

        // Ruins/Bunkers
        const ruinGeos = [
            {x: 12, z: -20, r: 0.2},
            {x: 25, z: -35, r: 1.5},
            {x: -15, z: -30, r: -0.5}
        ];

        ruinGeos.forEach(t => {
            const rGrp = new THREE.Group();
            const w1 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5, 1.2), mats.adobe);
            w1.position.y = 2.5; w1.castShadow = true; w1.receiveShadow = true;
            rGrp.add(w1);
            this.shootables.push(w1);

            rGrp.position.set(t.x, 0, t.z);
            rGrp.rotation.y = t.r;
            this.scene.add(rGrp);
        });
    }

    setupLockControls() {
        this.onBtnEnter = () => { document.body.requestPointerLock(); };
        document.getElementById('btn-enter').addEventListener('click', this.onBtnEnter);

        this.onLockChange = () => {
            const isLocked = document.pointerLockElement === document.body;
            this.player.isLocked = isLocked;
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

window.DesertScene = DesertScene;
