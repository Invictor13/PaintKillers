class ArcticScene {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.player = null;
        this.projectileManager = null;
        this.shootables = [];
        this.bots = [];
        this.clock = new THREE.Clock();
        this.animationFrameId = null;

        this.ARENA_LENGTH = 160;
        this.ARENA_WIDTH = 90;
        this.mapSeed = { offsetX: Math.random()*5000, offsetZ: Math.random()*5000, lakeOffset: (Math.random()-0.5)*60, lakeCurve: 0.015+Math.random()*0.04, hillSize: 12+Math.random()*20 };

        this.arenaGroup = new THREE.Group();
        this.backgroundGroup = new THREE.Group();
        this.animatedObjects = { pines: [] };

        this.snowParticles = null;
        this.particleCount = 4000;
        this.waterMesh = null;
    }

    init(container) {
        this.container = container;
        this.buildUI();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#cbd5e1');
        this.scene.fog = new THREE.FogExp2('#cbd5e1', 0.005);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

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
        this.buildWeather();

        window.getTerrainHeight = this.getTerrainHeight.bind(this);




        this.player = new window.Player(this.scene, this.camera);
        if (window.Store && window.Store.state && window.Store.state.playerColor) {
            this.player.setColor(window.Store.state.playerColor);
        }

        const raycaster = new THREE.Raycaster();
        this.projectileManager = new window.ProjectileManager(this.scene, raycaster, this.shootables);

        window.AppProjectileManager = this.projectileManager;
        window.AppBots = this.bots;

        // Base positions for teams
        this.basePositions = {
            player: new THREE.Vector3(-this.ARENA_LENGTH/2 + 10, 0, 0),
            enemy: new THREE.Vector3(this.ARENA_LENGTH/2 - 10, 0, 0)
        };

        // Adjust player start position to base
        this.player.yawObject.position.set(this.basePositions.player.x, this.getTerrainHeight(this.basePositions.player.x, this.basePositions.player.z) + 1.6, this.basePositions.player.z);
        this.player.yawObject.lookAt(0, this.player.yawObject.position.y, 0);

        // Instantiate Flags
        if (window.Flag) {
            let bY = this.getTerrainHeight(this.basePositions.player.x, this.basePositions.player.z);
            let rY = this.getTerrainHeight(this.basePositions.enemy.x, this.basePositions.enemy.z);

            const blueFlag = new window.Flag(this.scene, 'blue', new THREE.Vector3(this.basePositions.player.x, bY, this.basePositions.player.z), 0x00f3ff);
            const redFlag = new window.Flag(this.scene, 'red', new THREE.Vector3(this.basePositions.enemy.x, rY, this.basePositions.enemy.z), 0xff007f);

            this.gameManager.registerBases(this.basePositions.player, this.basePositions.enemy);
            this.gameManager.registerFlag(blueFlag);
            this.gameManager.registerFlag(redFlag);

            this.gameManager.addUpdatable(blueFlag);
            this.gameManager.addUpdatable(redFlag);
        }

        // Spawn Bots (Allies and Enemies)
        let squadSize = 3;
        if (window.Store && window.Store.state && window.Store.state.squadSize !== undefined) {
            squadSize = parseInt(window.Store.state.squadSize, 10);
        }

        if (window.Bot && squadSize > 0) {
            // Allies (squadSize - 1, since player counts as 1 for the team size, or just squadSize)
            // Assuming squadSize is total bots per team.
            let alliesCount = Math.max(0, squadSize - 1); // Subtract 1 for player
            for(let i=0; i<alliesCount; i++) {
                const b = new window.Bot(this.scene, this.shootables, false);
                b.meshGroup.position.set(this.basePositions.player.x + (Math.random()-0.5)*10, 20, this.basePositions.player.z + (Math.random()-0.5)*10);
                this.bots.push(b);
            }
            // Enemies (full squadSize)
            for(let i=0; i<squadSize; i++) {
                const b = new window.Bot(this.scene, this.shootables, true);
                b.meshGroup.position.set(this.basePositions.enemy.x + (Math.random()-0.5)*10, 20, this.basePositions.enemy.z + (Math.random()-0.5)*10);
                this.bots.push(b);
            }
        }
        window.AppGameManagerInstance = this.gameManager;

        window.updateCamModeUI = (isTPS) => {
            const el = document.getElementById('cam-mode');
            if (el) {
                el.innerText = isTPS ? "3ª Pessoa (TPS)" : "1ª Pessoa (FPS)";
                el.style.color = isTPS ? "#fbbf24" : "#10b981";
            }
        };

        window.updateScoreUI = (score) => {
            const el = document.getElementById('score-display');
            if (el) el.innerText = "PONTOS: " + score;
        };

        window.updateTeamScoreUI = (blue, red) => {
            const elBlue = document.getElementById('score-blue');
            const elRed = document.getElementById('score-red');
            if (elBlue) elBlue.innerText = blue;
            if (elRed) elRed.innerText = red;
        };

        window.showCTFMessage = (msg, isWarning) => {
            const el = document.getElementById('ctf-message');
            if (el) {
                el.innerText = msg;
                el.style.color = isWarning ? '#ff007f' : '#00f3ff';
                el.style.opacity = 1;
                setTimeout(() => el.style.opacity = 0, 3000);
            }
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
        <div id="blocker" style="position: absolute; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.95); display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; z-index: 50; backdrop-filter: blur(8px);">
            <div id="start-menu" style="text-align: center; background: rgba(0,0,0,0.8); padding: 40px; border-radius: 12px; border: 2px solid #0ea5e9; box-shadow: 0 15px 50px rgba(0,0,0,0.6); max-width: 480px;">
                <h1 style="color: #0ea5e9; margin-top: 0; text-transform: uppercase; letter-spacing: 3px; font-size: 2.2rem;">Ártico Tático</h1>
                <p style="color: #cbd5e1; line-height: 1.7; margin-bottom: 20px; font-size: 1.1rem;">
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">W A S D</span> Movimentar-se<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">ESPAÇO</span> Pular<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">MOUSE</span> Mirar e Atirar<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">V</span> Modo 3ª Pessoa<br>
                </p>
                <button id="btn-enter" style="background: #0ea5e9; color: white; border: none; padding: 16px 35px; font-size: 1.3rem; font-weight: 900; text-transform: uppercase; cursor: pointer; border-radius: 6px;">Entrar na Arena</button>
            </div>
        </div>

        <div id="ui-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; z-index: 10;">
            <div id="hud-top" style="padding: 25px; text-align: center; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px; border: 2px solid #00f3ff; color: #00f3ff;">
                    <span style="font-size: 1rem; font-weight: bold;">AZUL</span><br>
                    <span id="score-blue" style="font-size: 2.5rem; font-weight: 900;">0</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <p id="score-display" style="font-size: 2.0rem; font-weight: 900; color: #fbbf24; text-shadow: 2px 3px 0px #000; margin: 0;">PONTOS: 0</p>
                    <p id="ctf-message" style="font-size: 1.5rem; font-weight: 900; color: #fff; text-shadow: 2px 3px 0px #000; margin-top: 10px; opacity: 0; transition: opacity 0.5s;">Mensagem</p>
                </div>
                <div style="background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px; border: 2px solid #ff007f; color: #ff007f;">
                    <span style="font-size: 1rem; font-weight: bold;">VERMELHA</span><br>
                    <span id="score-red" style="font-size: 2.5rem; font-weight: 900;">0</span>
                </div>
            </div>
            <div id="center-ui" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center;">
                <div id="crosshair" style="width: 4px; height: 4px; background-color: rgba(255, 255, 255, 0.9); border-radius: 50%; position: relative; box-shadow: 0 0 4px rgba(0,0,0,0.8);">
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 2px; height: 8px; top: -14px; left: 1px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 2px; height: 8px; bottom: -14px; left: 1px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 8px; height: 2px; top: 1px; left: -14px;"></div>
                    <div style="position: absolute; background-color: rgba(255, 255, 255, 0.8); width: 8px; height: 2px; top: 1px; right: -14px;"></div>
                </div>
                <div id="hit-marker" style="position: absolute; width: 32px; height: 32px; opacity: 0; background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Cpath d=\\'M10 10 L40 40 M90 10 L60 40 M10 90 L40 60 M90 90 L60 60\\' stroke=\\'white\\' stroke-width=\\'10\\' stroke-linecap=\\'round\\'/%3E%3C/svg%3E'); background-size: cover; transition: transform 0.1s;"></div>
            </div>
            <div id="hud-bottom-left" style="position: absolute; bottom: 30px; left: 30px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.6); padding: 15px 20px; border-radius: 8px; border: 1px solid #444; text-shadow: 1px 1px 0 #000; backdrop-filter: blur(5px);">Modo: <span id="cam-mode" style="color:#0ea5e9;">1ª Pessoa (FPS)</span></div>
        </div>`;
    }

    setupLighting() {
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
        sunLight.position.set(50, 100, 30);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -160; sunLight.shadow.camera.right = 160;
        sunLight.shadow.camera.top = 160; sunLight.shadow.camera.bottom = -160;
        sunLight.shadow.mapSize.width = 4096; sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.bias = -0.0003;
        this.scene.add(sunLight);
    }

    buildWeather() {
        const sGeo = new THREE.BufferGeometry();
        const sPos = new Float32Array(this.particleCount * 3);

        for(let i=0; i<this.particleCount*3; i+=3) {
            sPos[i] = (Math.random()-0.5)*300;
            sPos[i+1] = Math.random()*150;
            sPos[i+2] = (Math.random()-0.5)*300;
        }

        sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
        this.snowParticles = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.0, transparent: true, opacity: 0.8 }));
        this.scene.add(this.snowParticles);
    }

    createProceduralTexture(type, baseColor, noiseColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = baseColor; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = noiseColor;

        const count = type === 'snow' ? 18000 : 9000;
        for(let i=0; i<count; i++) {
            const x = Math.random() * 512; const y = Math.random() * 512;
            ctx.globalAlpha = Math.random() * 0.4;
            if (type === 'snow') {
                ctx.fillRect(x, y, 2, 2);
            } else if (type === 'bark') {
                ctx.globalAlpha = 0.2;
                ctx.fillRect(x, y, 1, 30);
            } else if (type === 'metal') {
                ctx.globalAlpha = 0.15;
                ctx.fillRect(x, y, 4, 2);
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
            baseExt = Math.max(0, (dist - 80) * 0.2);
            let wave = Math.sin((x + this.mapSeed.offsetX) * 0.03) * Math.cos((z + this.mapSeed.offsetZ) * 0.03);
            baseExt += (wave * wave) * 20;
        }

        let lakeDepth = 0;
        let pathX = (this.ARENA_LENGTH / 2 + 50 + this.mapSeed.lakeOffset) + Math.sin(z * this.mapSeed.lakeCurve) * 35;
        let distToLake = Math.abs(x - pathX);
        if (distToLake < 20) {
            let carve = Math.cos((distToLake / 20) * (Math.PI / 2));
            lakeDepth = carve * (baseExt + 6);
        }

        const distFromCenterX = Math.abs(x);
        let edgeFlatten = 1;
        if (distFromCenterX > this.ARENA_LENGTH/2 - 30) edgeFlatten = Math.max(0, (this.ARENA_LENGTH/2 - distFromCenterX) / 30);

        const distFromCenter = Math.sqrt(x*x + z*z);
        let hill = 0;
        if (distFromCenter < 50) hill = Math.cos((distFromCenter / 50) * (Math.PI/2)) * this.mapSeed.hillSize;

        let noise = Math.sin((x + this.mapSeed.offsetX) * 0.045) * Math.cos((z + this.mapSeed.offsetZ) * 0.045) * 7;
        noise += Math.sin((x + this.mapSeed.offsetX) * 0.15 + (z + this.mapSeed.offsetZ) * 0.1) * 3.5;

        return ((noise + hill) * edgeFlatten) + baseExt - lakeDepth;
    }

    buildEnvironment() {
        const texSnow = this.createProceduralTexture('snow', '#f8fafc', '#e2e8f0');
        const texBark = this.createProceduralTexture('bark', '#334155', '#1e293b');
        const texMetal = this.createProceduralTexture('metal', '#64748b', '#475569');
        texSnow.repeat.set(20, 20);

        this.materials = {
            snow: new THREE.MeshStandardMaterial({ map: texSnow, roughness: 1.0 }),
            ice: new THREE.MeshStandardMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.7, metalness: 0.4, roughness: 0.1 }),
            bark: new THREE.MeshStandardMaterial({ map: texBark, roughness: 0.9 }),
            pine: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.8 }),
            metal: new THREE.MeshStandardMaterial({ map: texMetal, roughness: 0.7, metalness: 0.3 })
        };

        const segs = 140;
        const geo = new THREE.PlaneGeometry(this.ARENA_LENGTH*4, this.ARENA_WIDTH*4, segs, segs);
        const pos = geo.attributes.position;
        for(let i=0; i<pos.count; i++) pos.setZ(i, this.getTerrainHeight(pos.getX(i), -pos.getY(i)));
        geo.computeVertexNormals();
        const groundMesh = new THREE.Mesh(geo, this.materials.snow);
        groundMesh.rotation.x = -Math.PI/2; groundMesh.receiveShadow = true;
        this.arenaGroup.add(groundMesh);
        this.shootables.push(groundMesh);

        // Ice/Water
        const wGeo = new THREE.PlaneGeometry(this.ARENA_LENGTH*4, this.ARENA_WIDTH*4, 32, 32);
        this.waterMesh = new THREE.Mesh(wGeo, this.materials.ice);
        this.waterMesh.rotation.x = -Math.PI/2; this.waterMesh.position.y = -2.5;
        const wPos = wGeo.attributes.position; this.waterMesh.userData.baseZ = [];
        for(let i=0; i<wPos.count; i++) this.waterMesh.userData.baseZ.push(wPos.getZ(i));
        this.arenaGroup.add(this.waterMesh);

        const createPineTree = (x, z, isBg = false) => {
            const y = this.getTerrainHeight(x, z);
            if (y < -1.5) return;
            const tree = new THREE.Group();
            const trunkH = 5 + Math.random()*4;
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, trunkH, 8).translate(0, trunkH/2, 0), this.materials.bark);
            trunk.castShadow = !isBg; tree.add(trunk);
            if(!isBg) this.shootables.push(trunk);

            const layers = 3 + Math.floor(Math.random()*3);
            for(let i=0; i<layers; i++) {
                const layer = new THREE.Mesh(new THREE.ConeGeometry(2.5 - (i*0.4), 3, 8).translate(0, 1.5, 0), this.materials.pine);
                layer.position.y = (trunkH * 0.4) + (i * 1.5);
                layer.castShadow = !isBg;
                tree.add(layer);
                if(!isBg) {
                    layer.userData.baseRotZ = 0; layer.userData.offset = Math.random()*Math.PI;
                    this.animatedObjects.pines.push(layer);
                    this.shootables.push(layer);
                }
            }
            tree.position.set(x, y - 0.5, z);
            if(isBg) this.backgroundGroup.add(tree); else this.arenaGroup.add(tree);
        };

        const createBunker = (x, z, ry) => {
            const y = this.getTerrainHeight(x, z);
            const b = new THREE.Group();
            const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 1.5).translate(0, 2.5, 0), this.materials.metal);
            wall.castShadow = true; b.add(wall);
            this.shootables.push(wall);
            if(Math.random() > 0.4) {
                const side = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 6).translate(0, 2, 3), this.materials.metal);
                side.position.x = 3.25; b.add(side);
                this.shootables.push(side);
            }
            b.position.set(x, y - 1, z); b.rotation.y = ry;
            this.arenaGroup.add(b);
        };

        for(let i=0; i<300; i++) {
            const ang = Math.random()*Math.PI*2, rad = 100 + Math.random()*180;
            createPineTree(Math.cos(ang)*rad, Math.sin(ang)*rad, true);
        }

        for(let i=0; i<80; i++) {
            const x = (Math.random()-0.5)*140, z = (Math.random()-0.5)*80;
            if(Math.abs(x) > 45 || Math.abs(z) > 20) createPineTree(x, z);
        }
        for(let i=0; i<15; i++) createBunker((Math.random()-0.5)*120, (Math.random()-0.5)*75, Math.random()*Math.PI);
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
        if (this.player && this.bots) {
            this.bots.forEach(b => b.update(delta, this.player.yawObject.position));
            if (this.gameManager.handleCTFLogic) {
                this.gameManager.handleCTFLogic(this.player, this.bots);
            }
        }

        if (this.gameManager) this.gameManager.update(delta, time);

        this.animatedObjects.pines.forEach(layer => {
            layer.rotation.z = Math.sin(time * 1.0 * 0.5 + layer.userData.offset) * (0.04 * 1.5);
        });

        // Animate Snow Particles
        if (this.snowParticles) {
            const pos = this.snowParticles.geometry.attributes.position.array;
            for(let i=1; i<pos.length; i+=3) {
                pos[i] -= 1.0;
                pos[i-1] -= 1.5 * 1.5;
                if(pos[i] < 0 || pos[i-1] < -150) {
                    pos[i] = 180 + Math.random()*20;
                    pos[i-1] = 150;
                }
            }
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
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

window.ArcticScene = ArcticScene;