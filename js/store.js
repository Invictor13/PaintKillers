// Um simples store global para persistir dados entre as cenas (como localStorage na memória)

class GameStore {
    constructor() {
        this.loadState();
    }

    // Define o estado padrão
    defaultState = {
        playerColor: '#ff007f', // Cor primária padrão
        gameMode: 'treino',
        playerModel: 'masculino',
        squadSize: 3, // Padrão: 3 membros por equipe
    };

    state = { ...this.defaultState };

    // Carrega do localStorage se existir
    loadState() {
        try {
            const savedState = localStorage.getItem('paintKillersState');
            if (savedState) {
                this.state = { ...this.defaultState, ...JSON.parse(savedState) };
            }
        } catch (e) {
            console.warn('Could not load state from localStorage', e);
        }
    }

    // Salva no localStorage
    saveState() {
        try {
            localStorage.setItem('paintKillersState', JSON.stringify(this.state));
        } catch (e) {
            console.warn('Could not save state to localStorage', e);
        }
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        this.state[key] = value;
        this.saveState();
    }
}

window.Store = new GameStore();
