const fs = require('fs');

let content = fs.readFileSync('/app/js/scenes/menuScene.js', 'utf-8');

// Replace showPanel and handleMenuAction logic to show/hide 3D preview
content = content.replace(
`    showPanel(panelId) {
        this.container.querySelectorAll('.menu-wrapper').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        const target = this.container.querySelector(\`#\${panelId}\`);
        if (target) {
            target.classList.remove('hidden');
            target.style.display = 'flex';
        }
    }`,
`    showPanel(panelId) {
        this.container.querySelectorAll('.menu-wrapper').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        const target = this.container.querySelector(\`#\${panelId}\`);
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
    }`
);

// Add event listener for color and model change in setupUI
content = content.replace(
`        });
    }

    loadCurrentStoreSettings() {`,
`        });

        const colorInput = document.getElementById('sel-color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this.updatePreviewColor(e.target.value);
            });
        }

        const modelSelect = document.getElementById('sel-model');
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
        const paintColor = new THREE.Color(document.getElementById('sel-color').value || '#ff007f');

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
        const currentModel = document.getElementById('sel-model') ? document.getElementById('sel-model').value : 'masculino';
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

    loadCurrentStoreSettings() {`
);

// Limpeza no destroy
content = content.replace(
`        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
        }`,
`        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
        }
        this.teardown3DPreview();`
);

fs.writeFileSync('/app/js/scenes/menuScene.js', content, 'utf-8');
console.log("Patched successfully part 2");
