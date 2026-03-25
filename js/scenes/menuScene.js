export class MenuScene {
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
    }

    init(appContainer) {
        this.container = document.createElement('div');
        this.container.id = 'menu-scene';
        this.container.innerHTML = `
            <!-- Fundo -->
            <div id="canvas-container">
                <canvas id="bg-canvas"></canvas>
            </div>
            <div class="vignette"></div>
            <div class="grain"></div>
            <div class="decorative-line"></div>

            <!-- UI do Menu -->
            <div class="menu-wrapper">
                <div class="title-container">
                    <h1 class="title">
                        <span class="paint">Paint</span>
                        <span class="killers" id="title-killers">Killers</span>
                    </h1>
                    <div class="subtitle">Tactical Simulation</div>
                </div>

                <ul class="nav-menu">
                    <li class="nav-item" data-color="#00f3ff" data-action="select-mode">Selecionar Modo de Jogo</li>
                    <li class="nav-item" data-color="#dfff00" data-action="customize">Personalizar Jogador</li>
                    <li class="nav-item" data-color="#ff007f" data-action="arena-treino">Arena de Treino</li>
                    <li class="nav-item" data-color="#ff3333" data-action="exit">Sair</li>
                </ul>
            </div>

            <div class="footer-info">
                V 1.0.4 // BATTLE NET CONNECTED
            </div>
        `;
        appContainer.appendChild(this.container);

        this.setupAudio();
        this.setupUI();
        this.setupBackground();
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

        // Som de "Tick" tecnológico e suave
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

                titleKillers.style.color = 'transparent';
                titleKillers.style.webkitTextStroke = `2px ${color}`;
                titleKillers.style.textShadow = `0 0 30px ${color}40`;

                this.targetParticleColor = this.hexToRgb(color);
            });

            item.addEventListener('mouseleave', () => {
                titleKillers.style.color = 'transparent';
                titleKillers.style.webkitTextStroke = `2px rgba(255, 255, 255, 0.8)`;
                titleKillers.style.textShadow = 'none';

                this.targetParticleColor = { r: 85, g: 85, b: 102 };
            });

            item.addEventListener('click', () => {
                item.style.transform = 'translateX(25px) scale(0.98)';
                setTimeout(() => {
                    item.style.transform = 'translateX(15px) scale(1)';
                    // Handle routing based on action
                    const action = item.getAttribute('data-action');
                    this.handleMenuAction(action);
                }, 100);
            });
        });
    }

    handleMenuAction(action) {
        console.log(`Ação selecionada: ${action}`);
        // Aqui conectaremos com as futuras cenas:
        // if (action === 'arena-treino') {
        //     this.gameManager.loadScene(new ForestArenaScene(this.gameManager));
        // }
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
