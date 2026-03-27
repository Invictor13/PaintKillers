class AppGameManager {
    constructor() {
        this.score = 0; // Player score
        this.teamScores = { blue: 0, red: 0 };
        this.timer = 0;
        this.isRunning = false;

        this.flags = [];
        this.bases = { blue: null, red: null };

        // Update loops
        this.updatables = [];
    }

    startMatch() {
        this.score = 0;
        this.teamScores = { blue: 0, red: 0 };
        this.timer = 0;
        this.isRunning = true;
        this.updatables = [];
        this.flags = [];
        this.bases = { blue: null, red: null };
        console.log("Match started!");
        this.updateTeamScoreUI();
    }

    registerBases(blueBasePos, redBasePos) {
        this.bases.blue = blueBasePos;
        this.bases.red = redBasePos;
    }

    registerFlag(flag) {
        this.flags.push(flag);
    }

    updateTeamScoreUI() {
        if (window.updateTeamScoreUI) {
            window.updateTeamScoreUI(this.teamScores.blue, this.teamScores.red);
        }
    }

    notify(message, isWarning = false) {
        if (window.showCTFMessage) {
            window.showCTFMessage(message, isWarning);
        } else {
            console.log("CTF:", message);
        }
    }

    handleCTFLogic(player, bots) {
        // Simple distance-based flag pickup and capture logic

        // 1. Entities Check Flags
        let allEntities = [{entity: player, team: 'blue', isPlayer: true}];
        if (bots) {
            bots.forEach(b => {
                if (b.isActive) allEntities.push({entity: b, team: b.isEnemy ? 'red' : 'blue', isPlayer: false});
            });
        }

        this.flags.forEach(flag => {
            // Check pickup
            if (!flag.isCarried) {
                for (let e of allEntities) {
                    let pos = e.isPlayer ? e.entity.yawObject.position : e.entity.meshGroup.position;
                    let dist = pos.distanceTo(flag.meshGroup.position);

                    if (dist < 2.5) {
                        // Enemy team picks up the flag to steal it
                        if (e.team !== flag.team) {
                            flag.pickup(e.entity);
                            flag.carrierTeam = e.team;
                            this.notify(`A Equipa ${e.team === 'blue' ? 'Azul' : 'Vermelha'} roubou a bandeira!`, true);
                        }
                        // Own team touches dropped flag -> Return it
                        else if (e.team === flag.team && flag.meshGroup.position.distanceTo(flag.spawnPos) > 1.0) {
                            flag.returnToBase();
                            this.notify(`A bandeira ${flag.team === 'blue' ? 'Azul' : 'Vermelha'} foi recuperada!`);
                        }
                    }
                }
            }

            // Check capture
            if (flag.isCarried) {
                let cTeam = flag.carrierTeam;
                let carrierBasePos = cTeam === 'blue' ? this.bases.blue : this.bases.red;

                // Get carrier position
                let carrier = flag.carrier;
                let cPos = carrier.yawObject ? carrier.yawObject.position : carrier.meshGroup.position;

                if (carrierBasePos && cPos.distanceTo(carrierBasePos) < 5.0) {
                    // Carrier brought enemy flag to their own base

                    // Optional strict CTF rule: Can only capture if own flag is at base.
                    // For now, allow capture immediately for faster gameplay.

                    // Score point
                    this.teamScores[cTeam]++;
                    this.updateTeamScoreUI();
                    this.notify(`Ponto para a Equipa ${cTeam === 'blue' ? 'Azul' : 'Vermelha'}!`);

                    // If player, give personal score
                    if (carrier.yawObject) {
                        this.addScore(1000);
                    }

                    // Reset flag
                    flag.returnToBase();
                }
            }
        });
    }

    endMatch() {
        this.isRunning = false;
        console.log("Match ended. Final Score:", this.score);
    }

    addScore(points) {
        this.score += points;
        // Optionally dispatch event to update UI
        if (window.updateScoreUI) {
            window.updateScoreUI(this.score);
        }
    }

    addUpdatable(obj) {
        if (obj && typeof obj.update === 'function') {
            this.updatables.push(obj);
        }
    }

    update(delta, time) {
        if (!this.isRunning) return;

        this.timer += delta;

        for (let obj of this.updatables) {
            obj.update(delta, time);
        }
    }
}

// Register globally
window.AppGameManager = AppGameManager;
