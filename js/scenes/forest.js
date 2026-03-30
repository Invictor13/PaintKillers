class ForestScene {
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
        this.mapSeed = {
            offsetX: Math.random() * 1000, offsetZ: Math.random() * 1000,
            river1Offset: (Math.random() - 0.5) * 40, river2Offset: (Math.random() - 0.5) * 40,
            riverCurve1: 0.02 + Math.random() * 0.05, riverCurve2: 0.02 + Math.random() * 0.05,
            hillSize: 8 + Math.random() * 10, hillOffsetZ: (Math.random() - 0.5) * 30
        };

        this.arenaGroup = new THREE.Group();
        this.backgroundGroup = new THREE.Group();

        this.animatedObjects = { leaves: [], flags: [], clouds: [], turbines: [] };
        this.worldState = { windSpeed: 1.0 };
        this.waterMesh = null;
    }

    init(container) {
        this.container = container;
        this.buildUI();

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2('#5b8c9c', 0.003);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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

            const playerColor = (window.Store && window.Store.state && window.Store.state.playerColor) ? parseInt(window.Store.state.playerColor.replace('#', '0x')) : 0x00f3ff;
            const enemyColor = (window.Store && window.Store.state && window.Store.state.enemyColor) ? parseInt(window.Store.state.enemyColor.replace('#', '0x')) : 0xff007f;

            const blueFlag = new window.Flag(this.scene, 'blue', new THREE.Vector3(this.basePositions.player.x, bY, this.basePositions.player.z), playerColor);
            const redFlag = new window.Flag(this.scene, 'red', new THREE.Vector3(this.basePositions.enemy.x, rY, this.basePositions.enemy.z), enemyColor);

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
        <div id="blocker" style="position: absolute; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.85); display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; z-index: 50; backdrop-filter: blur(8px);">
            <div id="start-menu" style="text-align: center; background: rgba(30, 41, 59, 0.95); padding: 40px; border-radius: 12px; border: 2px solid #10b981; box-shadow: 0 15px 50px rgba(0,0,0,0.6); max-width: 480px;">
                <h1 style="color: #10b981; margin-top: 0; text-transform: uppercase; letter-spacing: 3px; font-size: 2.2rem; text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);">Floresta Tática</h1>
                <p style="color: #cbd5e1; line-height: 1.7; margin-bottom: 20px; font-size: 1.1rem;">
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">W A S D</span> Movimentar-se<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">ESPAÇO</span> Pular<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">MOUSE</span> Mirar e Atirar<br>
                    <span style="color: #fbbf24; background: #222; padding: 3px 8px; border-radius: 4px; border: 1px solid #666; font-family: monospace;">V</span> Modo 3ª Pessoa<br>
                </p>
                <button id="btn-enter" style="background: #10b981; color: white; border: none; padding: 16px 35px; font-size: 1.3rem; font-weight: 900; text-transform: uppercase; cursor: pointer; border-radius: 6px;">Entrar na Arena</button>
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
            <div id="hud-bottom-left" style="position: absolute; bottom: 30px; left: 30px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.6); padding: 15px 20px; border-radius: 8px; border: 1px solid #444; text-shadow: 1px 1px 0 #000; backdrop-filter: blur(5px);">Modo: <span id="cam-mode" style="color:#10b981;">1ª Pessoa (FPS)</span></div>
        </div>`;
    }

    setupLighting() {
        this.scene.background = new THREE.Color('#5b8c9c');
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        sunLight.position.set(50, 100, 30);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -150; sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150; sunLight.shadow.camera.bottom = -150;
        sunLight.shadow.mapSize.width = 4096; sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);
    }

    createProceduralTexture(type, baseColor, noiseColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = baseColor; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = noiseColor;

        const noiseCount = type === 'wood' ? 1000 : 5000;
        for(let i=0; i<noiseCount; i++) {
            const x = Math.random() * 256; const y = Math.random() * 256;
            if (type === 'wood') {
                ctx.globalAlpha = Math.random() * 0.3; ctx.fillRect(x, y, 1, 10 + Math.random() * 30);
            } else if (type === 'grass') {
                ctx.globalAlpha = Math.random() * 0.5; ctx.fillRect(x, y, 2, 2);
            } else if (type === 'rock' || type === 'concrete') {
                ctx.globalAlpha = Math.random() * 0.2; ctx.fillRect(x, y, 2 + Math.random()*3, 2 + Math.random()*3);
            } else if (type === 'brick') {
                ctx.globalAlpha = Math.random() * 0.4; ctx.fillRect(x, y, 3, 1);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    getTerrainHeight(x, z) {
        let baseExt = 0;
        if (Math.abs(x) > this.ARENA_LENGTH/2 || Math.abs(z) > this.ARENA_WIDTH/2) {
            let dist = Math.sqrt(x*x + z*z);
            baseExt = Math.max(0, (dist - Math.max(this.ARENA_LENGTH/2, this.ARENA_WIDTH/2)) * 0.12);
            let wave = Math.sin((x + this.mapSeed.offsetX) * 0.03) * Math.cos((z + this.mapSeed.offsetZ) * 0.03);
            baseExt += (wave * wave) * 15;
        }

        let riverDepth = 0;
        let riverCurveX = (this.ARENA_LENGTH / 2 + 40 + this.mapSeed.river1Offset) + Math.sin((z + this.mapSeed.offsetZ) * this.mapSeed.riverCurve1) * 25;
        let distToRiver = Math.abs(x - riverCurveX);
        if (distToRiver < 15) {
            let carve = Math.cos((distToRiver / 15) * (Math.PI / 2));
            riverDepth = carve * (baseExt + 3);
        }

        let riverCurveX2 = -(this.ARENA_LENGTH / 2 + 40 + this.mapSeed.river2Offset) + Math.cos((z + this.mapSeed.offsetZ) * this.mapSeed.riverCurve2) * 25;
        let distToRiver2 = Math.abs(x - riverCurveX2);
        if (distToRiver2 < 15) {
            let carve = Math.cos((distToRiver2 / 15) * (Math.PI / 2));
            riverDepth = Math.max(riverDepth, carve * (baseExt + 3));
        }

        const distFromCenterX = Math.abs(x);
        let edgeFlatten = 1;
        if (distFromCenterX > this.ARENA_LENGTH/2 - 25) { edgeFlatten = Math.max(0, (this.ARENA_LENGTH/2 - distFromCenterX) / 25); }

        const distFromCenter = Math.sqrt(x*x + Math.pow(z - this.mapSeed.hillOffsetZ, 2));
        let hillHeight = 0;
        if (distFromCenter < 35) { hillHeight = Math.cos((distFromCenter / 35) * (Math.PI/2)) * this.mapSeed.hillSize; }

        let noise = Math.sin((x + this.mapSeed.offsetX) * 0.08) * Math.cos((z + this.mapSeed.offsetZ) * 0.08) * 4;
        noise += Math.sin((x + this.mapSeed.offsetX) * 0.15 + (z + this.mapSeed.offsetZ) * 0.1) * 2.0;

        return ((noise + hillHeight) * edgeFlatten) + baseExt - riverDepth;
    }

    buildEnvironment() {
        const texGrass = this.createProceduralTexture('grass', '#3b5e2b', '#2a421e');
        const texWood = this.createProceduralTexture('wood', '#5c4a3d', '#3a2d24');
        const texRock = this.createProceduralTexture('rock', '#6b7280', '#4b5563');
        const texBrick = this.createProceduralTexture('brick', '#8c4830', '#5e2b1b');
        texGrass.repeat.set(25, 25);

        this.materials = {
            grass: new THREE.MeshStandardMaterial({ map: texGrass, roughness: 1.0 }),
            wood: new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.9 }),
            leaves: new THREE.MeshStandardMaterial({ color: '#2d4c1e', roughness: 0.8 }),
            rock: new THREE.MeshStandardMaterial({ map: texRock, roughness: 0.9, flatShading: true }),
            brick: new THREE.MeshStandardMaterial({ map: texBrick, roughness: 0.9 }),
            water: new THREE.MeshStandardMaterial({ color: '#1ca3ec', transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.3 })
        };

        // Terrain Ground
        const segments = 150;
        const groundGeo = new THREE.PlaneGeometry(this.ARENA_LENGTH * 4, this.ARENA_WIDTH * 4, segments, segments);
        const pos = groundGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setZ(i, this.getTerrainHeight(pos.getX(i), -pos.getY(i)));
        }
        groundGeo.computeVertexNormals();
        const groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
        groundMesh.rotation.x = -Math.PI / 2; groundMesh.receiveShadow = true;
        this.arenaGroup.add(groundMesh);
        this.shootables.push(groundMesh);

        // Exterior Rivers
        const waterGeo = new THREE.PlaneGeometry(this.ARENA_LENGTH * 4, this.ARENA_WIDTH * 4, 32, 32);
        this.waterMesh = new THREE.Mesh(waterGeo, this.materials.water);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.y = -1.8;
        const wPos = waterGeo.attributes.position;
        this.waterMesh.userData.basePositions = [];
        for(let i=0; i<wPos.count; i++) this.waterMesh.userData.basePositions.push(wPos.getZ(i));
        this.arenaGroup.add(this.waterMesh);

        // Trees
        const createTree = (x, z, isBackground = false) => {
            const y = this.getTerrainHeight(x, z);
            if (y < -1.0) return;
            const tree = new THREE.Group();
            const trunkHeight = 4 + Math.random() * 3;
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 7).translate(0, trunkHeight/2, 0), this.materials.wood);
            trunk.castShadow = !isBackground; trunk.receiveShadow = !isBackground; tree.add(trunk);

            const leavesCount = isBackground ? 1 : 2 + Math.floor(Math.random() * 2);
            for(let i=0; i<leavesCount; i++) {
                const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random(), isBackground ? 0 : 1), this.materials.leaves);
                leaf.scale.set(0.8+Math.random()*0.5, 0.8+Math.random()*0.4, 0.8+Math.random()*0.5);
                leaf.position.set((Math.random()-0.5)*1.5, trunkHeight + (Math.random()*2), (Math.random()-0.5)*1.5);
                const baseRotX = Math.random()*Math.PI, baseRotZ = Math.random()*Math.PI;
                leaf.rotation.set(baseRotX, Math.random()*Math.PI, baseRotZ); leaf.castShadow = !isBackground;

                if(!isBackground) {
                    leaf.userData.baseRotX = baseRotX; leaf.userData.baseRotZ = baseRotZ;
                    leaf.userData.swayOffset = Math.random() * Math.PI * 2;
                    this.animatedObjects.leaves.push(leaf);
                }
                tree.add(leaf);
                if(!isBackground) this.shootables.push(leaf);
            }
            tree.position.set(x, y - 1.5, z);
            if(isBackground) this.backgroundGroup.add(tree); else this.arenaGroup.add(tree);
            if(!isBackground) this.shootables.push(trunk);
        };

        // Dense Background Forest
        for (let i = 0; i < 400; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = (Math.max(this.ARENA_LENGTH, this.ARENA_WIDTH)/2) + 10 + Math.random() * 140;
            createTree(Math.cos(angle) * radius, Math.sin(angle) * radius, true);
        }

        // Tactical Forest
        for (let i = 0; i < 80; i++) {
            const x = (Math.random() - 0.5) * (this.ARENA_LENGTH - 4), z = (Math.random() - 0.5) * (this.ARENA_WIDTH - 4);
            if (Math.abs(x) > this.ARENA_LENGTH/2 - 35 && Math.abs(z) < 25) continue;
            createTree(x, z);
        }

        // Rocks & Ruins
        for (let i = 0; i < 60; i++) {
            const x = (Math.random()-0.5)*(this.ARENA_LENGTH-10);
            const z = (Math.random()-0.5)*(this.ARENA_WIDTH-10);
            const y = this.getTerrainHeight(x, z);
            if (y < -1.0) continue;
            const scale = 0.5+Math.random()*1.5;
            const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 1), this.materials.rock);
            rock.scale.set(scale*(0.8+Math.random()*0.6), scale*(0.4+Math.random()*0.5), scale*(0.8+Math.random()*0.6));
            rock.position.set(x, y - (scale * 1.5), z);
            rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
            rock.castShadow = true; rock.receiveShadow = true;
            this.arenaGroup.add(rock);
            this.shootables.push(rock);
        }

        for(let i=0; i<8; i++) {
            const x = (Math.random()-0.5)*(this.ARENA_LENGTH-20);
            const z = (Math.random()-0.5)*(this.ARENA_WIDTH-15);
            const rotY = Math.random()*Math.PI;
            const y = this.getTerrainHeight(x, z);
            if (y < -1.0) continue;
            const ruin = new THREE.Group();
            const w1 = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 0.5).translate(0, 2.25, 0), this.materials.brick);
            w1.castShadow = true; w1.receiveShadow = true; ruin.add(w1);
            const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.6, 6).translate(0, 1.8, 3), this.materials.brick);
            w2.position.set(4, 0, 0); w2.castShadow = true; w2.receiveShadow = true; ruin.add(w2);
            ruin.position.set(x, y - 1.5, z); ruin.rotation.y = rotY;
            this.arenaGroup.add(ruin);
            this.shootables.push(w1, w2);
        }
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

        // Env Animations
        const wind = this.worldState.windSpeed;
        this.animatedObjects.leaves.forEach(leaf => {
            leaf.rotation.x = leaf.userData.baseRotX + Math.sin(time * wind + leaf.userData.swayOffset) * (0.1 * Math.min(wind, 3));
            leaf.rotation.z = leaf.userData.baseRotZ + Math.cos(time * 0.8 * wind + leaf.userData.swayOffset) * (0.1 * Math.min(wind, 3));
        });

        if (this.waterMesh) {
            const wPos = this.waterMesh.geometry.attributes.position;
            for(let i=0; i<wPos.count; i++) {
                const vx = wPos.getX(i);
                const vy = wPos.getY(i);
                const wave = Math.sin(vx * 0.5 + time) * 0.1 + Math.cos(vy * 0.3 + time * 1.5) * 0.1;
                wPos.setZ(i, this.waterMesh.userData.basePositions[i] + wave);
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

window.ForestScene = ForestScene;