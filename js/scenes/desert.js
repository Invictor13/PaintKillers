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

        this.ARENA_LENGTH = 160;
        this.ARENA_WIDTH = 90;
        this.mapSeed = {
            offsetX: Math.random() * 5000, offsetZ: Math.random() * 5000,
            canyonOffset: (Math.random() - 0.5) * 60, canyonCurve: 0.015 + Math.random() * 0.04,
            hillSize: 12 + Math.random() * 14, duneFrequency: 0.01 + Math.random() * 0.02
        };

        this.arenaGroup = new THREE.Group();
        this.backgroundGroup = new THREE.Group();

        this.animatedObjects = { cactus: [], flags: [], clouds: [], turbines: [] };
        this.worldState = { windSpeed: 1.0, rainIntensity: 0, sandstormIntensity: 0, isStorm: false };
        this.waterMesh = null;
    }

    init(container) {
        this.container = container;
        this.buildUI();

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2('#d2b48c', 0.0035);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3500);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);

        this.scene.add(this.arenaGroup);
        this.scene.add(this.backgroundGroup);

        this.setupLighting();
        this.buildEnvironment();

        window.getTerrainHeight = this.getTerrainHeight.bind(this);

        this.player = new window.Player(this.scene, this.camera);
        if (window.Store && window.Store.state && window.Store.state.playerColor) {
            this.player.setColor(window.Store.state.playerColor);
        }

        const raycaster = new THREE.Raycaster();
        this.projectileManager = new window.ProjectileManager(this.scene, raycaster, this.shootables);

        window.AppProjectileManager = this.projectileManager;
        window.AppGameManagerInstance = this.gameManager;

        window.updateCamModeUI = (isTPS) => {
            const el = document.getElementById('cam-mode');
            if (el) {
                el.innerText = isTPS ? "3ª Pessoa (TPS)" : "1ª Pessoa (FPS)";
                el.style.color = isTPS ? "#fbbf24" : "#d97706";
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
        this.scene.background = new THREE.Color('#d2b48c');
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.3);
        sunLight.position.set(50, 100, 30);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -160; sunLight.shadow.camera.right = 160;
        sunLight.shadow.camera.top = 160; sunLight.shadow.camera.bottom = -160;
        sunLight.shadow.mapSize.width = 4096; sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.bias = -0.0003;
        this.scene.add(sunLight);
    }

    createProceduralTexture(type, baseColor, noiseColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = baseColor; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = noiseColor;

        const count = type === 'sand' ? 15000 : 8000;
        for(let i=0; i<count; i++) {
            const x = Math.random() * 512; const y = Math.random() * 512;
            ctx.globalAlpha = Math.random() * 0.4;
            if (type === 'sand') {
                ctx.fillRect(x, y, 1.5, 1.5);
            } else if (type === 'cactus') {
                ctx.globalAlpha = 0.1;
                ctx.fillRect(x, y, 1, 25);
            } else if (type === 'adobe') {
                ctx.globalAlpha = 0.2;
                ctx.fillRect(x, y, 4, 3);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    getTerrainHeight(x, z) {
        let baseExt = 0;
        if (Math.abs(x) > this.ARENA_LENGTH/2 || Math.abs(z) > this.ARENA_WIDTH/2) {
            let dist = Math.sqrt(x*x + z*z);
            baseExt = Math.max(0, (dist - 80) * 0.18);
            let wave = Math.sin((x + this.mapSeed.offsetX) * 0.025) * Math.cos((z + this.mapSeed.offsetZ) * 0.025);
            baseExt += (wave * wave) * 18;
        }

        let canyonDepth = 0;
        let canyonPathX = (this.ARENA_LENGTH / 2 + 45 + this.mapSeed.canyonOffset) + Math.sin(z * this.mapSeed.canyonCurve) * 35;
        let distToCanyon = Math.abs(x - canyonPathX);
        if (distToCanyon < 18) {
            let carve = Math.cos((distToCanyon / 18) * (Math.PI / 2));
            canyonDepth = carve * (baseExt + 5);
        }

        const distFromCenterX = Math.abs(x);
        let edgeFlatten = 1;
        if (distFromCenterX > this.ARENA_LENGTH/2 - 30) edgeFlatten = Math.max(0, (this.ARENA_LENGTH/2 - distFromCenterX) / 30);

        const distFromCenter = Math.sqrt(x*x + z*z);
        let hill = 0;
        if (distFromCenter < 45) hill = Math.cos((distFromCenter / 45) * (Math.PI/2)) * this.mapSeed.hillSize;

        let noise = Math.sin((x + this.mapSeed.offsetX) * 0.05) * Math.cos((z + this.mapSeed.offsetZ) * 0.05) * 6;
        noise += Math.sin((x + this.mapSeed.offsetX) * 0.12 + (z + this.mapSeed.offsetZ) * 0.08) * 3.0;

        return ((noise + hill) * edgeFlatten) + baseExt - canyonDepth;
    }

    buildEnvironment() {
        const texSand = this.createProceduralTexture('sand', '#d2b48c', '#c3a37a');
        const texAdobe = this.createProceduralTexture('adobe', '#b38b6d', '#8b6d5c');
        const texCactus = this.createProceduralTexture('cactus', '#4d632c', '#3a4a21');
        texSand.repeat.set(20, 20);

        this.materials = {
            sand: new THREE.MeshStandardMaterial({ map: texSand, roughness: 1.0 }),
            adobe: new THREE.MeshStandardMaterial({ map: texAdobe, roughness: 0.9 }),
            cactus: new THREE.MeshStandardMaterial({ map: texCactus, roughness: 0.8 }),
            canyonWater: new THREE.MeshStandardMaterial({ color: '#1ca3ec', transparent: true, opacity: 0.6, metalness: 0.2, roughness: 0.1 })
        };

        const segs = 140;
        const geo = new THREE.PlaneGeometry(this.ARENA_LENGTH*4, this.ARENA_WIDTH*4, segs, segs);
        const pos = geo.attributes.position;
        for(let i=0; i<pos.count; i++) pos.setZ(i, this.getTerrainHeight(pos.getX(i), -pos.getY(i)));
        geo.computeVertexNormals();
        const groundMesh = new THREE.Mesh(geo, this.materials.sand);
        groundMesh.rotation.x = -Math.PI/2; groundMesh.receiveShadow = true;
        this.arenaGroup.add(groundMesh);
        this.shootables.push(groundMesh);

        // Wadi/Water
        const wGeo = new THREE.PlaneGeometry(this.ARENA_LENGTH*4, this.ARENA_WIDTH*4, 32, 32);
        this.waterMesh = new THREE.Mesh(wGeo, this.materials.canyonWater);
        this.waterMesh.rotation.x = -Math.PI/2; this.waterMesh.position.y = -2.2;
        const wPos = wGeo.attributes.position; this.waterMesh.userData.baseZ = [];
        for(let i=0; i<wPos.count; i++) this.waterMesh.userData.baseZ.push(wPos.getZ(i));
        this.arenaGroup.add(this.waterMesh);

        const createCactus = (x, z, isBg = false) => {
            const y = this.getTerrainHeight(x, z);
            if (y < -1.5) return;
            const cactus = new THREE.Group();
            const h = 4 + Math.random()*4;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, h, 8).translate(0, h/2, 0), this.materials.cactus);
            stem.castShadow = !isBg; stem.receiveShadow = !isBg; cactus.add(stem);

            const arms = 1 + Math.floor(Math.random()*3);
            for(let i=0; i<arms; i++) {
                const armH = 2 + Math.random()*2;
                const arm = new THREE.Group();
                const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, armH, 8).translate(0, armH/2, 0), this.materials.cactus);
                arm.add(seg1);
                arm.position.y = 1 + Math.random()*(h-2);
                arm.rotation.z = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random()*0.5);
                arm.rotation.y = Math.random()*Math.PI*2;
                cactus.add(arm);

                if(!isBg) {
                    arm.userData.baseRotZ = arm.rotation.z;
                    arm.userData.offset = Math.random()*Math.PI;
                    this.animatedObjects.cactus.push(arm);
                }
                if(!isBg) this.shootables.push(seg1);
            }

            cactus.position.set(x, y - 0.5, z);
            if(isBg) this.backgroundGroup.add(cactus); else this.arenaGroup.add(cactus);
            if(!isBg) this.shootables.push(stem);
        };

        const createAdobeRuin = (x, z, ry) => {
            const y = this.getTerrainHeight(x, z);
            if (y < -1.0) return;
            const r = new THREE.Group();
            const w1 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5, 1.2).translate(0, 2.5, 0), this.materials.adobe);
            w1.castShadow = true; w1.receiveShadow = true; r.add(w1);
            this.shootables.push(w1);
            if(Math.random() > 0.4) {
                const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 6.5).translate(0, 2, 3.25), this.materials.adobe);
                w2.position.x = 3.65; w2.castShadow = true; r.add(w2);
                this.shootables.push(w2);
            }
            r.position.set(x, y - 1.2, z); r.rotation.y = ry;
            this.arenaGroup.add(r);
        };

        for(let i=0; i<400; i++) {
            const ang = Math.random()*Math.PI*2, rad = 100 + Math.random()*160;
            createCactus(Math.cos(ang)*rad, Math.sin(ang)*rad, true);
        }

        for(let i=0; i<70; i++) {
            const x = (Math.random()-0.5)*140, z = (Math.random()-0.5)*80;
            if(Math.abs(x) > 40 || Math.abs(z) > 15) createCactus(x, z);
        }
        for(let i=0; i<12; i++) createAdobeRuin((Math.random()-0.5)*120, (Math.random()-0.5)*70, Math.random()*Math.PI);
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

        const wind = this.worldState.windSpeed;
        this.animatedObjects.cactus.forEach(arm => {
            arm.rotation.z = arm.userData.baseRotZ + Math.sin(time * wind * 0.5 + arm.userData.offset) * (0.05 * Math.min(wind, 4));
        });

        if(this.waterMesh) {
            const wPos = this.waterMesh.geometry.attributes.position;
            for(let i=0; i<wPos.count; i++) {
                const wave = Math.sin(wPos.getX(i)*0.5 + time) * 0.12 + Math.cos(wPos.getY(i)*0.4 + time*1.2) * 0.1;
                wPos.setZ(i, this.waterMesh.userData.baseZ[i] + wave);
            }
            wPos.needsUpdate = true;
        }

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