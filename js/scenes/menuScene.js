class MenuScene {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.container = null;
        this.audioCtx = null;
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.resizeHandler = null;

        // Particle System State
        this.particles = [];
        this.width = 0;
        this.height = 0;
        this.currentParticleColor = { r: 85, g: 85, b: 102 };
        this.targetParticleColor = { r: 85, g: 85, b: 102 };

        // 3D Preview State
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewPlayer = null;
        this.previewAnimationId = null;
    }

    init(appContainer) {
        this.container = document.createElement('div');
        this.container.id = 'menu-scene';
        this.container.innerHTML = `
            <!-- Fundo -->
            <div id="canvas-container">
                <canvas id="bg-canvas"></canvas>
            </div>
            <!-- 3D Preview Container -->
            <div id="preview-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; display: none;"></div>
            <div class="vignette"></div>
            <div class="grain"></div>
            <div class="decorative-line"></div>

            <!-- UI do Menu Principal -->
            <div id="main-menu" class="menu-wrapper">
                <div class="title-container">
                    <h1 class="title">
                        <span class="paint">Paint</span>
                        <span class="killers" id="title-killers">Killers</span>
                    </h1>
                    <div class="subtitle">Tactical Simulation</div>
                </div>

                <ul class="nav-menu">
                    <li class="nav-item" data-color="#00f3ff" data-action="select-mode">Selecionar Mapa</li>
                    <li class="nav-item" data-color="#dfff00" data-action="customize">Personalizar Jogador</li>
                    <li class="nav-item" data-color="#ff007f" data-action="arena-treino">Arena de Treino</li>
                </ul>
            </div>

            <!-- Sub-Menu: Seleção de Mapa -->
            <div id="map-menu" class="menu-wrapper hidden">
                <div class="title-container">
                    <h1 class="title" style="font-size: 3rem;">
                        <span class="killers" style="color: #00f3ff;">Mapas</span>
                    </h1>
                </div>

                <ul class="nav-menu">
                    <li class="nav-item" data-color="#10b981" data-action="map-forest">Floresta Tática</li>
                    <li class="nav-item" data-color="#d97706" data-action="map-desert">Deserto Operacional</li>
                    <li class="nav-item" data-color="#0ea5e9" data-action="map-arctic">Ártico Extremo</li>
                    <li class="nav-item" data-color="#9333ea" data-action="map-random">Modo Aleatório</li>
                    <li class="nav-item" data-color="#ff3333" data-action="back-main" style="margin-top: 20px; font-size: 1.2rem;">Voltar</li>
                </ul>
            </div>

            <!-- Sub-Menu: Personalizar -->
            <div id="customize-menu" class="menu-wrapper hidden" style="z-index: 5; pointer-events: auto; background: rgba(0,0,0,0.6); padding: 30px; border-radius: 12px; width: 400px; margin-left: -50%;">
                <div class="title-container">
                    <h1 class="title" style="font-size: 3rem;">
                        <span class="killers" style="color: #dfff00;">Loadout</span>
                    </h1>
                </div>

                <div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); width: 100%; text-align: left; margin-bottom: 20px; backdrop-filter: blur(5px);">
                    <label style="color: #aaa; font-weight: bold; font-size: 0.9rem; margin-bottom: 5px; display: block;">Modelo do Personagem</label>
                    <select id="sel-model" style="width: 100%; background: #111; color: white; padding: 10px; border: 1px solid #444; border-radius: 4px; font-size: 1rem; margin-bottom: 15px;">
                        <option value="masculino">Atirador Masculino</option>
                        <option value="feminino">Atiradora Feminina</option>
                    </select>

                    <label style="color: #aaa; font-weight: bold; font-size: 0.9rem; margin-bottom: 5px; display: block;">Cor da Tinta e Roupa</label>
                    <input type="color" id="sel-color" value="#ff007f" style="width: 100%; height: 50px; border: none; cursor: pointer; background: transparent;">
                </div>

                <ul class="nav-menu">
                    <li class="nav-item" data-color="#dfff00" data-action="save-customize">Salvar e Voltar</li>
                </ul>
            </div>

            <div class="footer-info">
                V 2.0.0 // BATTLE NET CONNECTED
            </div>
        `;
        appContainer.appendChild(this.container);

        this.setupAudio();
        this.setupUI();
        this.setupBackground();
        this.loadCurrentStoreSettings();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
        }
        this.teardown3DPreview();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }

    setupAudio() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playHoverSound() {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.05);

        filter.type = 'highpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);

        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 0.1);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    setupUI() {
        const navItems = this.container.querySelectorAll('.nav-item');
        const titleKillers = this.container.querySelector('#title-killers');

        navItems.forEach(item => {
            const color = item.getAttribute('data-color');
            item.style.setProperty('--hover-color', color);

            item.addEventListener('mouseenter', () => {
                this.playHoverSound();

                if (titleKillers) {
                    titleKillers.style.color = 'transparent';
                    titleKillers.style.webkitTextStroke = `2px ${color}`;
                    titleKillers.style.textShadow = `0 0 30px ${color}40`;
                }
                this.targetParticleColor = this.hexToRgb(color);
            });

            item.addEventListener('mouseleave', () => {
                if (titleKillers) {
                    titleKillers.style.color = 'transparent';
                    titleKillers.style.webkitTextStroke = `2px rgba(255, 255, 255, 0.8)`;
                    titleKillers.style.textShadow = 'none';
                }
                this.targetParticleColor = { r: 85, g: 85, b: 102 };
            });

            item.addEventListener('click', () => {
                item.style.transform = 'translateX(25px) scale(0.98)';
                setTimeout(() => {
                    item.style.transform = 'translateX(15px) scale(1)';
                    const action = item.getAttribute('data-action');
                    this.handleMenuAction(action);
                }, 100);
            });
        });

        // Event listeners are set up using querySelector to ensure we are referencing the elements in the newly created container
        const colorInput = this.container.querySelector('#sel-color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this.updatePreviewColor(e.target.value);
            });
        }

        const modelSelect = this.container.querySelector('#sel-model');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.updatePreviewModel(e.target.value);
            });
        }
    }

    updatePreviewColor(colorHex) {
        if (!this.previewPlayer || !this.previewPlayer.mesh) return;

        const color = new THREE.Color(colorHex);
        this.previewPlayer.mesh.traverse((child) => {
            if (child.isMesh && child.material && child.name.includes("Paint")) {
                child.material.color.copy(color);
            }
        });
    }

    updatePreviewModel(modelType) {
        if (!this.previewScene) return;

        // Remove old player
        if (this.previewPlayer && this.previewPlayer.mesh) {
            this.previewScene.remove(this.previewPlayer.mesh);
        }

        // Recreate player with new model
        // We simulate a light version of the Player class for the menu
        this.previewPlayer = { mesh: new THREE.Group() };

        // Crio uma representação simplificada do personagem (apenas para o preview)
        const isMale = modelType === 'masculino';

        // Cores
        const bodyColor = 0x111111; // Traje tático escuro
        const colorInput = this.container.querySelector('#sel-color');
        const paintColor = new THREE.Color(colorInput ? colorInput.value : '#ff007f');

        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8, metalness: 0.2 });
        const paintMat = new THREE.MeshStandardMaterial({ color: paintColor, roughness: 0.4, metalness: 0.1 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6, metalness: 0.1 });

        // Tronco (Colete)
        const torsoGeom = isMale ? new THREE.BoxGeometry(0.5, 0.6, 0.3) : new THREE.BoxGeometry(0.4, 0.55, 0.25);
        const torso = new THREE.Mesh(torsoGeom, bodyMat);
        torso.position.y = 1.0;

        // Detalhes de cor da equipe no colete
        const vestDetailGeom = isMale ? new THREE.BoxGeometry(0.52, 0.2, 0.32) : new THREE.BoxGeometry(0.42, 0.18, 0.27);
        const vestDetail = new THREE.Mesh(vestDetailGeom, paintMat);
        vestDetail.name = "PaintVest";
        torso.add(vestDetail);

        // Cabeça (Capacete de Paintball)
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.4, 0);

        const headGeom = isMale ? new THREE.BoxGeometry(0.3, 0.35, 0.3) : new THREE.BoxGeometry(0.25, 0.3, 0.25);
        const head = new THREE.Mesh(headGeom, bodyMat);
        headGroup.add(head);

        const maskGeom = isMale ? new THREE.BoxGeometry(0.28, 0.2, 0.05) : new THREE.BoxGeometry(0.24, 0.18, 0.05);
        const mask = new THREE.Mesh(maskGeom, new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0.8 }));
        mask.position.set(0, 0, 0.15);
        headGroup.add(mask);

        // Detalhe de cor no capacete
        const helmetStripeGeom = isMale ? new THREE.BoxGeometry(0.32, 0.05, 0.32) : new THREE.BoxGeometry(0.27, 0.05, 0.27);
        const helmetStripe = new THREE.Mesh(helmetStripeGeom, paintMat);
        helmetStripe.name = "PaintHelmet";
        helmetStripe.position.y = 0.1;
        headGroup.add(helmetStripe);

        torso.add(headGroup);

        // Arma
        const gunGroup = new THREE.Group();
        gunGroup.position.set(0.15, -0.1, 0.3);

        const gunBodyGeom = new THREE.BoxGeometry(0.08, 0.1, 0.4);
        const gunBody = new THREE.Mesh(gunBodyGeom, bodyMat);
        gunGroup.add(gunBody);

        const gunBarrelGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.3);
        const gunBarrel = new THREE.Mesh(gunBarrelGeom, bodyMat);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0, 0.02, 0.3);
        gunGroup.add(gunBarrel);

        const hopperGeom = new THREE.CylinderGeometry(0.06, 0.04, 0.15);
        const hopper = new THREE.Mesh(hopperGeom, new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.8 }));
        hopper.position.set(0, 0.1, -0.05);
        gunGroup.add(hopper);

        const hopperPaintGeom = new THREE.CylinderGeometry(0.05, 0.03, 0.1);
        const hopperPaint = new THREE.Mesh(hopperPaintGeom, paintMat);
        hopperPaint.name = "PaintHopper";
        hopperPaint.position.set(0, 0.1, -0.05);
        gunGroup.add(hopperPaint);

        torso.add(gunGroup);

        this.previewPlayer.mesh.add(torso);

        // Posicionamento base
        this.previewPlayer.mesh.position.set(2, -0.5, 0);
        this.previewPlayer.mesh.rotation.y = -Math.PI / 6; // Angulo para visualização 3/4

        this.previewScene.add(this.previewPlayer.mesh);
    }

    setup3DPreview() {
        const previewContainer = this.container.querySelector('#preview-container');
        if (!previewContainer || this.previewRenderer) return; // Já inicializado

        // Limpa o container caso já exista algo
        previewContainer.innerHTML = '';

        this.previewScene = new THREE.Scene();

        // Adiciona um ambient light suave e uma luz direcional para destacar o modelo
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.previewScene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(5, 5, 5);
        this.previewScene.add(dirLight);

        const backLight = new THREE.DirectionalLight(0x4444ff, 1.0); // Luz azulada de trás para dar volume
        backLight.position.set(-5, 5, -5);
        this.previewScene.add(backLight);

        // Camera setup
        this.previewCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.previewCamera.position.set(0, 1.5, 5);

        // Renderer setup
        this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.previewRenderer.setSize(window.innerWidth, window.innerHeight);
        this.previewRenderer.setPixelRatio(window.devicePixelRatio);
        this.previewRenderer.setClearColor(0x000000, 0); // Transparente para ver o canvas atrás
        previewContainer.appendChild(this.previewRenderer.domElement);

        // Criar o modelo inicial baseado no select atual
        const modelSelect = this.container.querySelector('#sel-model');
        const currentModel = modelSelect ? modelSelect.value : 'masculino';
        this.updatePreviewModel(currentModel);

        // Resize listener
        this.previewResizeHandler = () => {
            if (this.previewCamera && this.previewRenderer) {
                this.previewCamera.aspect = window.innerWidth / window.innerHeight;
                this.previewCamera.updateProjectionMatrix();
                this.previewRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', this.previewResizeHandler);

        // Animation loop
        const animate = () => {
            this.previewAnimationId = requestAnimationFrame(animate);

            if (this.previewPlayer && this.previewPlayer.mesh) {
                // Rotação suave idle
                this.previewPlayer.mesh.rotation.y = -Math.PI / 6 + Math.sin(Date.now() * 0.001) * 0.1;
                // Respiração suave
                this.previewPlayer.mesh.position.y = -0.5 + Math.sin(Date.now() * 0.002) * 0.02;
            }

            this.previewRenderer.render(this.previewScene, this.previewCamera);
        };

        animate();
    }

    teardown3DPreview() {
        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
            this.previewAnimationId = null;
        }

        if (this.previewResizeHandler) {
            window.removeEventListener('resize', this.previewResizeHandler);
            this.previewResizeHandler = null;
        }

        if (this.previewRenderer) {
            const previewContainer = this.container.querySelector('#preview-container');
            if (previewContainer && previewContainer.contains(this.previewRenderer.domElement)) {
                previewContainer.removeChild(this.previewRenderer.domElement);
            }
            this.previewRenderer.dispose();
            this.previewRenderer = null;
        }

        this.previewScene = null;
        this.previewCamera = null;
        this.previewPlayer = null;
    }

    loadCurrentStoreSettings() {
        if (window.Store && window.Store.state) {
            const selModel = this.container.querySelector('#sel-model');
            const selColor = this.container.querySelector('#sel-color');
            if (selModel) selModel.value = window.Store.state.playerModel || 'masculino';
            if (selColor) selColor.value = window.Store.state.playerColor || '#ff007f';
        }
    }

    saveCurrentStoreSettings() {
        if (window.Store) {
            const selModel = this.container.querySelector('#sel-model');
            const selColor = this.container.querySelector('#sel-color');
            if (selModel) window.Store.set('playerModel', selModel.value);
            if (selColor) window.Store.set('playerColor', selColor.value);
        }
    }

    showPanel(panelId) {
        this.container.querySelectorAll('.menu-wrapper').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        const target = this.container.querySelector(`#${panelId}`);
        if (target) {
            target.classList.remove('hidden');
            target.style.display = 'flex';
        }

        const previewContainer = this.container.querySelector('#preview-container');
        if (panelId === 'customize-menu') {
            if (previewContainer) previewContainer.style.display = 'block';
            this.setup3DPreview();
        } else {
            if (previewContainer) previewContainer.style.display = 'none';
            this.teardown3DPreview();
        }
    }

    handleMenuAction(action) {
        console.log(`Ação selecionada: ${action}`);

        if (action === 'select-mode') {
            this.showPanel('map-menu');
        }
        else if (action === 'customize') {
            this.showPanel('customize-menu');
        }
        else if (action === 'back-main') {
            this.showPanel('main-menu');
        }
        else if (action === 'save-customize') {
            this.saveCurrentStoreSettings();
            this.showPanel('main-menu');
        }
        else if (action === 'arena-treino') {
            if (window.gameManager) window.gameManager.loadArena('training');
        }
        else if (action === 'map-forest') {
            if (window.gameManager) window.gameManager.loadArena('forest');
        }
        else if (action === 'map-desert') {
            if (window.gameManager) window.gameManager.loadArena('desert');
        }
        else if (action === 'map-arctic') {
            if (window.gameManager) window.gameManager.loadArena('arctic');
        }
        else if (action === 'map-random') {
            const maps = ['forest', 'desert', 'arctic'];
            const randomMap = maps[Math.floor(Math.random() * maps.length)];
            if (window.gameManager) window.gameManager.loadArena(randomMap);
        }
    }

    setupBackground() {
        this.canvas = this.container.querySelector('#bg-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resizeHandler = () => {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', this.resizeHandler);
        this.resizeHandler();

        this.particles = [];
        for (let i = 0; i < 80; i++) {
            this.particles.push(this.createParticle());
        }

        this.animateCanvas();
    }

    createParticle() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 4 + 1,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            alpha: Math.random() * 0.5 + 0.1
        };
    }

    updateParticle(p) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
    }

    drawParticle(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${Math.floor(this.currentParticleColor.r)}, ${Math.floor(this.currentParticleColor.g)}, ${Math.floor(this.currentParticleColor.b)}, ${p.alpha})`;
        this.ctx.fill();

        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = `rgb(${Math.floor(this.currentParticleColor.r)}, ${Math.floor(this.currentParticleColor.g)}, ${Math.floor(this.currentParticleColor.b)})`;
    }

    animateCanvas = () => {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.currentParticleColor.r += (this.targetParticleColor.r - this.currentParticleColor.r) * 0.05;
        this.currentParticleColor.g += (this.targetParticleColor.g - this.currentParticleColor.g) * 0.05;
        this.currentParticleColor.b += (this.targetParticleColor.b - this.currentParticleColor.b) * 0.05;

        this.particles.forEach(p => {
            this.updateParticle(p);
            this.drawParticle(p);
        });

        this.animationFrameId = requestAnimationFrame(this.animateCanvas);
    }
}
