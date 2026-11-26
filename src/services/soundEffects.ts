// Web Audio API Sound System for Reinos em Guerra
// Synthesizes short, responsive, low-latency audio effects for cards, attacks, and round transitions

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  constructor() {
    // Load mute preference
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('reinos_em_guerra_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('reinos_em_guerra_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) {
          this.volume = Math.max(0, Math.min(1, parsed));
        }
      }

      // Auto-unlock Web Audio on first user interaction to comply with browser autoplay policies
      const unlockAudio = () => {
        this.initCtx();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(): AudioNode | null {
    this.initCtx();
    if (!this.ctx || this.isMuted) return null;
    return this.masterGain || this.ctx.destination;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('reinos_em_guerra_muted', String(this.isMuted));
      window.dispatchEvent(new CustomEvent('alvorecer-audio-change'));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    this.isMuted = this.volume === 0;
    if (typeof window !== 'undefined') {
      localStorage.setItem('reinos_em_guerra_volume', String(this.volume));
      localStorage.setItem('reinos_em_guerra_muted', String(this.isMuted));
      window.dispatchEvent(new CustomEvent('alvorecer-audio-change'));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // ----------------------------------------------------
  // 1. INVOVAÇÃO DE CARTAS (Card Summon)
  // ----------------------------------------------------
  // Som curto, com impacto firme na mesa + rápido estalo de card + brilho harmônico
  public playSummon() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;

    // A) Impacto grave no feltro/mesa (punch rápido)
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(175, t);
    thud.frequency.exponentialRampToValueAtTime(42, t + 0.18);

    thudGain.gain.setValueAtTime(0.35, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    thud.connect(thudGain);
    thudGain.connect(out);
    thud.start(t);
    thud.stop(t + 0.22);

    // B) Estalo de carta (card snap crisp)
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(980, t);
    snap.frequency.exponentialRampToValueAtTime(240, t + 0.05);

    snapGain.gain.setValueAtTime(0.14, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    snap.connect(snapGain);
    snapGain.connect(out);
    snap.start(t);
    snap.stop(t + 0.07);

    // C) Brilho místico de entrada em campo (tríade harmônica ascendente rápida)
    const chimes = [523.25, 659.25, 783.99]; // C5, E5, G5
    chimes.forEach((freq, idx) => {
      const chime = this.ctx!.createOscillator();
      const chimeGain = this.ctx!.createGain();
      const delay = t + 0.03 + idx * 0.03;

      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, delay);

      chimeGain.gain.setValueAtTime(0.08, delay);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, delay + 0.2);

      chime.connect(chimeGain);
      chimeGain.connect(out);
      chime.start(delay);
      chime.stop(delay + 0.22);
    });
  }

  // ----------------------------------------------------
  // 2. ATAQUES (Attacks)
  // ----------------------------------------------------
  // Declaração de Ataque: Lâmina cortando o ar (aerodinâmico)
  public playAttack() {
    this.playAttackDeclare();
  }

  public playAttackDeclare() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Choque de Combate / Ataque atingindo defensor (Clash)
  public playClash() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;

    // Lâmina 1 (metal cortante)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(340, t);
    osc1.frequency.exponentialRampToValueAtTime(90, t + 0.2);

    // Lâmina 2 (ressonância áspera)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(520, t);
    osc2.frequency.exponentialRampToValueAtTime(110, t + 0.16);

    // Centelha de impacto agudo
    const spark = this.ctx.createOscillator();
    spark.type = 'triangle';
    spark.frequency.setValueAtTime(1300, t);
    spark.frequency.exponentialRampToValueAtTime(400, t + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    spark.connect(gain);
    gain.connect(out);

    osc1.start(t);
    osc2.start(t);
    spark.start(t);
    osc1.stop(t + 0.24);
    osc2.stop(t + 0.24);
    spark.stop(t + 0.24);
  }

  // Ataque Direto na Vida do Jogador (Direct Hit)
  public playPlayerHit() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.42);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.46);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // ----------------------------------------------------
  // 3. FINALIZAÇÃO DE RODADAS (Round End)
  // ----------------------------------------------------
  // Som solene e distinto indicando encerramento da rodada e alternância de papéis
  public playRoundEnd() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;

    // A) Gongo/Sino solene de fechamento de rodada (acorde harmônico suave: A3, E4, A4)
    const notes = [220, 329.63, 440];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // Fade-in de 15ms suave contra pop acústico
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14 - idx * 0.02, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + 0.45);
    });

    // B) Toque de transição e resolução cristalina (E5 ligeiramente defasado)
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    const chimeDelay = t + 0.08;

    chime.type = 'triangle';
    chime.frequency.setValueAtTime(659.25, chimeDelay);
    chime.frequency.exponentialRampToValueAtTime(523.25, chimeDelay + 0.32);

    chimeGain.gain.setValueAtTime(0.001, chimeDelay);
    chimeGain.gain.linearRampToValueAtTime(0.09, chimeDelay + 0.02);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeDelay + 0.36);

    chime.connect(chimeGain);
    chimeGain.connect(out);
    chime.start(chimeDelay);
    chime.stop(chimeDelay + 0.38);
  }

  // ----------------------------------------------------
  // OUTROS EFEITOS DE JOGO
  // ----------------------------------------------------

  // Compra de carta: swoosh suave
  public playDraw() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Bloqueio com escudo
  public playShieldBlock() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.3);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Conjuramento de Habilidade / Magia
  public playSpell() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.09, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.22);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.25);
    });
  }

  // Fusão especial (O Atormentador)
  public playFusion() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    [220, 330, 440, 660, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(0.12, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.32);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.35);
    });
  }

  // Orquestra Web Audio para a animação de Subida de Nível (Tier 5 / Tier 6)
  public playLevelUpAscension(
    tier: number,
    category: string,
    instantImpactOnly = false
  ): (() => void) | undefined {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return undefined;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const isTier6 = tier >= 6 || category === 'singularity' || category === 'blood_eclipse';

    // Select bespoke chord voicings per card theme
    const chordMap: Record<string, number[]> = {
      singularity: [110, 164.81, 220, 329.63, 440, 659.25], // Deep cosmic A power/9th
      blood_eclipse: [123.47, 185, 246.94, 293.66, 369.99, 493.88], // Dark B minor crimson
      frost: [261.63, 329.63, 392, 493.88, 587.33, 783.99], // Crystalline Cmaj9
      storm: [146.83, 220, 293.66, 369.99, 440, 587.33], // High-voltage D major
      runic_earth: [130.81, 196, 261.63, 329.63, 392], // Grounded C monolith
      seraphic: [293.66, 369.99, 440, 554.37, 659.25, 880], // Cathedral Dmaj9
      fae_prism: [329.63, 415.3, 493.88, 622.25, 739.99, 987.77], // Iridescent Emaj9
      abyssal_tide: [164.81, 246.94, 329.63, 392, 493.88, 659.25], // Abyssal Em9
      firmament: [261.63, 392, 523.25, 659.25, 783.99, 1046.5], // Sovereign C angelic
      solar_flare: [196, 293.66, 392, 493.88, 587.33, 783.99], // Radiant Gmaj9
      lunar_dream: [220, 261.63, 329.63, 392, 493.88, 659.25], // Ethereal Am9
    };
    const chord = chordMap[category] || chordMap.seraphic;

    const triggerClimax = (startAt: number) => {
      try {
        // 1. Sub-bass impact drop
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(isTier6 ? 118 : 138, startAt);
        sub.frequency.exponentialRampToValueAtTime(isTier6 ? 32 : 44, startAt + 0.85);
        subGain.gain.setValueAtTime(0.001, startAt);
        subGain.gain.linearRampToValueAtTime(isTier6 ? 0.28 : 0.2, startAt + 0.03);
        subGain.gain.exponentialRampToValueAtTime(0.001, startAt + 1.15);
        sub.connect(subGain);
        subGain.connect(out);
        sub.start(startAt);
        sub.stop(startAt + 1.2);

        // 2. Lush harmonic chord bloom
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === 0 ? 'triangle' : idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, startAt + idx * 0.025);
          const peak = Math.max(0.035, 0.095 - idx * 0.01);
          gain.gain.setValueAtTime(0.001, startAt + idx * 0.025);
          gain.gain.linearRampToValueAtTime(peak, startAt + idx * 0.025 + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, startAt + idx * 0.025 + (isTier6 ? 1.85 : 1.4));
          osc.connect(gain);
          gain.connect(out);
          osc.start(startAt + idx * 0.025);
          osc.stop(startAt + idx * 0.025 + (isTier6 ? 1.9 : 1.45));
        });

        // 3. Crystalline shimmer overtone
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(chord[chord.length - 1] * 2, startAt + 0.05);
        chimeGain.gain.setValueAtTime(0.001, startAt + 0.05);
        chimeGain.gain.linearRampToValueAtTime(0.06, startAt + 0.12);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, startAt + 1.35);
        chime.connect(chimeGain);
        chimeGain.connect(out);
        chime.start(startAt + 0.05);
        chime.stop(startAt + 1.4);
      } catch {
        // Ignore audio scheduling errors if context closes
      }
    };

    if (instantImpactOnly) {
      triggerClimax(now);
      return undefined;
    }

    // Phase 1: Gathering swell + ascending crystalline arpeggio (0s -> 1.45s)
    const swell = ctx.createOscillator();
    const swellGain = ctx.createGain();
    swell.type = 'sine';
    swell.frequency.setValueAtTime(isTier6 ? 65 : 88, now);
    swell.frequency.exponentialRampToValueAtTime(isTier6 ? 185 : 220, now + 1.45);
    swellGain.gain.setValueAtTime(0.001, now);
    swellGain.gain.linearRampToValueAtTime(0.11, now + 1.38);
    swellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.52);
    swell.connect(swellGain);
    swellGain.connect(out);
    swell.start(now);
    swell.stop(now + 1.55);

    chord.slice(0, 5).forEach((freq, idx) => {
      const noteTime = now + 0.12 + idx * 0.22;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 1.5, noteTime);
      g.gain.setValueAtTime(0.001, noteTime);
      g.gain.linearRampToValueAtTime(0.055, noteTime + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.42);
      osc.connect(g);
      g.connect(out);
      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });

    // Phase 2: Schedule climax chord at 1.48s
    const climaxTimer = window.setTimeout(() => {
      if (this.ctx) {
        triggerClimax(this.ctx.currentTime);
      }
    }, 1480);

    return () => {
      window.clearTimeout(climaxTimer);
    };
  }

  // Tic-tac de aviso do cronômetro
  public playTick() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Descarte de carta: slide para o cemitério
  public playDiscard() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.16);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Destruição / Morte da carta: quebra/estilhaço
  public playDeath() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.32);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  // Contra-ataque de ricochete
  public playReboundCounter() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Fanfarra de Vitória
  public playVictory() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.09);
      gain.gain.setValueAtTime(0.15, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.5);
    });
  }

  // Fanfarra Celestial Divina — Vitória do Conselho Celestial (Aliança Angiris)
  public playCelestialCouncilVictory() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      dur: number,
      type: OscillatorType,
      vol: number,
      attack = 0.04
    ) => {
      if (!this.ctx) return;
      const st = t + startOffset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(vol, st + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, st + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(st);
      osc.stop(st + dur + 0.04);
    };

    // Fase 1 (0.0s): Harpa Celestial ascendente + Coro de catedral suave
    const harpNotes = [261.63, 392.0, 523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    harpNotes.forEach((f, idx) => {
      playTone(f, idx * 0.085, 0.85, 'sine', 0.13, 0.02);
    });
    [130.81, 196.0, 329.63, 493.88].forEach((f) => {
      playTone(f, 0.0, 1.4, 'triangle', 0.09, 0.25);
    });

    // Fase 2 (1.2s): Ascensão das Asas Seráficas (acorde celestial crescente)
    const ascensionChimes = [392.0, 587.33, 783.99, 987.77, 1318.51];
    ascensionChimes.forEach((f, idx) => {
      playTone(f, 1.2 + idx * 0.1, 1.15, 'triangle', 0.13, 0.05);
    });
    [196.0, 293.66, 493.88].forEach((f) => {
      playTone(f, 1.2, 1.35, 'sine', 0.12, 0.2);
    });

    // Fase 3 (2.45s): Apoteose Divina — Sinos celestiais e acorde triunfal dourado
    const apotheosisChord = [130.81, 261.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    apotheosisChord.forEach((f, idx) => {
      playTone(f, 2.45 + idx * 0.025, 1.7, idx < 3 ? 'triangle' : 'sine', idx < 3 ? 0.14 : 0.11, 0.04);
    });
    // Badalada de sino sagrado agudo
    [1046.5, 1567.98, 2093.0].forEach((f, idx) => {
      playTone(f, 2.5, 1.5 - idx * 0.2, 'sine', 0.11, 0.015);
    });
  }

  // Correntes Mágicas + Compressão + Envio à Mão (Subjugar / Capturar)
  public playCaptureChains() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    const ping = (freqStart: number, freqEnd: number, offset: number, dur: number, type: OscillatorType, vol: number) => {
      const st = t + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, st);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), st + dur);
      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(vol, st + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, st + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(st);
      osc.stop(st + dur + 0.02);
    };

    // Fase 1 (0.0s - 0.55s): Elos metálicos disparando e envolvendo a carta + trava do selo
    [0.02, 0.09, 0.17, 0.25, 0.34].forEach((off, idx) => {
      const base = 1320 + idx * 185;
      ping(base, base * 0.72, off, 0.11, 'triangle', 0.12);
      ping(base * 1.48, base * 1.12, off + 0.015, 0.08, 'sine', 0.09);
    });
    // Impacto firme do cadeado rúnico fechando (0.48s)
    ping(240, 68, 0.46, 0.24, 'triangle', 0.22);
    ping(987.77, 1479.98, 0.46, 0.36, 'sine', 0.14);

    // Fase 2 (0.88s - 1.32s): Compressão mágica / redução da carta acorrentada
    ping(660, 293.66, 0.90, 0.42, 'sine', 0.15);
    ping(880, 440, 0.94, 0.38, 'triangle', 0.11);

    // Fase 3 (1.42s - 1.98s): Voo até a mão + chegada cristalina
    ping(330, 783.99, 1.38, 0.36, 'sine', 0.12);
    ping(783.99, 1174.66, 1.82, 0.32, 'sine', 0.14);
    ping(1567.98, 1567.98, 1.88, 0.26, 'triangle', 0.09);
  }

  // Som de Derrota
  public playDefeat() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [300, 270, 240, 200];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.18);
      gain.gain.setValueAtTime(0.12, t + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.32);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 0.36);
    });
  }

  // Som de Empate
  public playDrawGame() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [330, 440, 554.37, 660];
    chords.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  // Tiro de Canhão do Tabuleiro
  public playCannonFire() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Impacto inicial
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.38);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.6);

    // 2. Sub grave estendido
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.75);
    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(t);
    subOsc.stop(t + 1.05);

    // 3. Estalo de pólvora
    const crackle = this.ctx.createOscillator();
    const crackleGain = this.ctx.createGain();
    crackle.type = 'square';
    crackle.frequency.setValueAtTime(480, t);
    crackle.frequency.exponentialRampToValueAtTime(60, t + 0.22);
    crackleGain.gain.setValueAtTime(0.2, t);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    crackle.connect(crackleGain);
    crackleGain.connect(out);
    crackle.start(t);
    crackle.stop(t + 0.28);
  }

  // ----------------------------------------------------
  // CRIO-GÊNESE: TORNADO DE GELO & IMPACTO CRIOGÊNICO
  // ----------------------------------------------------
  public playCrioGenese() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Vendaval do Tornado Glacial (White Noise com Bandpass Filter varrendo frequências)
    const duration = 2.1;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4.5, t);
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.exponentialRampToValueAtTime(1450, t + 0.85);
    filter.frequency.exponentialRampToValueAtTime(620, t + 1.45);
    filter.frequency.exponentialRampToValueAtTime(1850, t + 1.85);
    filter.frequency.exponentialRampToValueAtTime(320, t + duration);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.001, t);
    windGain.gain.linearRampToValueAtTime(0.28, t + 0.25);
    windGain.gain.setValueAtTime(0.28, t + 1.55);
    windGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(out);
    noise.start(t);
    noise.stop(t + duration);

    // 2. Cristais de Gelo Girando no Vórtice (Arpejo cristalino agudo)
    const iceFreqs = [1046.5, 1318.5, 1567.98, 2093.0, 1567.98, 2349.32, 2637.02, 3135.96];
    iceFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = t + 0.12 + idx * 0.18;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.22);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(start + 0.35);
    });

    // 3. Impacto de Congelamento Profundo (Sub-grave + Estilhaço de Gelo nas unidades)
    const impactTime = t + 1.15;
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, impactTime);
    sub.frequency.exponentialRampToValueAtTime(34, impactTime + 0.65);
    subGain.gain.setValueAtTime(0.36, impactTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.7);
    sub.connect(subGain);
    subGain.connect(out);
    sub.start(impactTime);
    sub.stop(impactTime + 0.75);
  }

  // ----------------------------------------------------
  // ANIMAÇÕES DE HABILIDADES ESPECÍFICAS
  // ----------------------------------------------------

  // 1. ENGANAR: Sussurro espectral roxo + integração sombria na carta
  public playSkillEnganar() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Sopro espectral filtrado (névoa sombria girando)
    const dur = 1.65;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(6.0, t);
    filter.frequency.setValueAtTime(680, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.85);
    filter.frequency.exponentialRampToValueAtTime(920, t + 1.25);
    filter.frequency.exponentialRampToValueAtTime(180, t + dur);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.001, t);
    nGain.gain.linearRampToValueAtTime(0.24, t + 0.25);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(out);
    noise.start(t);
    noise.stop(t + dur);

    // B) Acorde fantasmagórico convergente (integração na unidade em t + 0.75s)
    const ghostFreqs = [311.13, 392.0, 466.16, 622.25]; // Eb menor misterioso
    ghostFreqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 1.15, t + idx * 0.08);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.85);
      gain.gain.setValueAtTime(0.001, t + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t + idx * 0.08);
      osc.stop(t + 1.6);
    });

    // C) Pulso grave de assimilação furtiva
    const pulse = this.ctx.createOscillator();
    const pGain = this.ctx.createGain();
    pulse.type = 'triangle';
    pulse.frequency.setValueAtTime(160, t + 0.8);
    pulse.frequency.exponentialRampToValueAtTime(48, t + 1.35);
    pGain.gain.setValueAtTime(0.32, t + 0.8);
    pGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    pulse.connect(pGain);
    pGain.connect(out);
    pulse.start(t + 0.8);
    pulse.stop(t + 1.42);
  }

  // 2. LEVANTAR MORAL: Corneta de guerra real ressoando nota heroica inspiradora
  public playSkillLevantarMoral() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Fanfarra de corneta de sopro (quinta justa ascendente para oitava brilhante: D4 -> A4 -> D5)
    const hornNotes = [
      { freq: 293.66, start: 0.0, dur: 0.24, vol: 0.20 },
      { freq: 440.0, start: 0.22, dur: 0.26, vol: 0.24 },
      { freq: 587.33, start: 0.46, dur: 1.15, vol: 0.30 },
    ];

    hornNotes.forEach((n) => {
      // Harmônicos de metal/latão (sawtooth + triangle filtrados)
      [1, 2, 3].forEach((harm, hIdx) => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();

        osc.type = hIdx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(n.freq * harm, t + n.start);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, t + n.start);
        filter.frequency.linearRampToValueAtTime(2600, t + n.start + 0.08);

        const hVol = n.vol / (harm * 1.35);
        gain.gain.setValueAtTime(0.001, t + n.start);
        gain.gain.linearRampToValueAtTime(hVol, t + n.start + 0.04);
        gain.gain.setValueAtTime(hVol * 0.9, t + n.start + n.dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        osc.start(t + n.start);
        osc.stop(t + n.start + n.dur + 0.04);
      });
    });
  }

  // 3. LABAREDA SOLAR: Pilar de fogo solar rugindo e atingindo o alvo
  public playSkillLabaredaSolar() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Impacto explosivo da coluna solar
    const boom = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(190, t);
    boom.frequency.exponentialRampToValueAtTime(36, t + 0.55);
    bGain.gain.setValueAtTime(0.38, t);
    bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    boom.connect(bGain);
    bGain.connect(out);
    boom.start(t);
    boom.stop(t + 0.68);

    // B) Rugido contínuo do pilar de plasma/fogo
    const dur = 1.75;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const fireNoise = this.ctx.createBufferSource();
    fireNoise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, t);
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(1100, t + 0.45);
    filter.frequency.exponentialRampToValueAtTime(240, t + dur);

    const fGain = this.ctx.createGain();
    fGain.gain.setValueAtTime(0.001, t);
    fGain.gain.linearRampToValueAtTime(0.34, t + 0.12);
    fGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    fireNoise.connect(filter);
    filter.connect(fGain);
    fGain.connect(out);
    fireNoise.start(t);
    fireNoise.stop(t + dur);

    // C) Oscilação de Torpor hipnótico no final
    [520, 440, 370].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const st = t + 0.65 + i * 0.18;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, st + 0.22);
      g.gain.setValueAtTime(0.11, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 0.28);
    });
  }

  // 4. DESAFIO REAL: Duas espadas de ferro se cruzando com tinido metálico autêntico
  public playSkillDesafioReal() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Swoosh rápido das duas lâminas vindo em direção ao centro
    [0, 0.08].forEach((offset) => {
      const sw = this.ctx!.createOscillator();
      const swG = this.ctx!.createGain();
      sw.type = 'sawtooth';
      sw.frequency.setValueAtTime(620, t + offset);
      sw.frequency.exponentialRampToValueAtTime(180, t + offset + 0.15);
      swG.gain.setValueAtTime(0.16, t + offset);
      swG.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.17);
      sw.connect(swG);
      swG.connect(out);
      sw.start(t + offset);
      sw.stop(t + offset + 0.18);
    });

    // B) Impacto de ferro batendo no ferro (t + 0.22s): Parciais inarmônicas de aço temperado
    const clashTime = t + 0.22;
    const steelPartials = [1180, 1740, 2480, 3320, 4210, 5680];
    steelPartials.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, clashTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.985, clashTime + 0.85);

      const amp = 0.22 / (1 + idx * 0.45);
      gain.gain.setValueAtTime(amp, clashTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, clashTime + 0.55 + (6 - idx) * 0.08);

      osc.connect(gain);
      gain.connect(out);
      osc.start(clashTime);
      osc.stop(clashTime + 1.15);
    });

    // C) Transiente metálico cortante (raspagem de lâminas no cruzamento)
    const scrapeDur = 0.16;
    const bufSize = Math.floor(this.ctx.sampleRate * scrapeDur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'bandpass';
    hpFilter.Q.setValueAtTime(8, clashTime);
    hpFilter.frequency.setValueAtTime(3400, clashTime);
    hpFilter.frequency.exponentialRampToValueAtTime(1900, clashTime + scrapeDur);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.32, clashTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, clashTime + scrapeDur);
    noise.connect(hpFilter);
    hpFilter.connect(nGain);
    nGain.connect(out);
    noise.start(clashTime);
    noise.stop(clashTime + scrapeDur + 0.02);
  }

  // 5. VOTO DOS CAÍDOS: Lamento de espectro branco + impacto atordoante
  public playSkillVotoCaidos() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Lamento etéreo do espectro branco mergulhando sobre o alvo
    [784, 1046.5].forEach((freq, idx) => {
      const wail = this.ctx!.createOscillator();
      const wGain = this.ctx!.createGain();
      wail.type = 'sine';
      wail.frequency.setValueAtTime(freq, t);
      wail.frequency.exponentialRampToValueAtTime(freq * 1.32, t + 0.35);
      wail.frequency.exponentialRampToValueAtTime(freq * 0.58, t + 0.95);
      wGain.gain.setValueAtTime(0.001, t);
      wGain.gain.linearRampToValueAtTime(0.16 - idx * 0.04, t + 0.15);
      wGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      wail.connect(wGain);
      wGain.connect(out);
      wail.start(t);
      wail.stop(t + 1.05);
    });

    // B) Impacto espectral de atordoamento (t + 0.52s)
    const hitT = t + 0.52;
    const thud = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thud.type = 'sawtooth';
    thud.frequency.setValueAtTime(210, hitT);
    thud.frequency.exponentialRampToValueAtTime(42, hitT + 0.48);
    tGain.gain.setValueAtTime(0.35, hitT);
    tGain.gain.exponentialRampToValueAtTime(0.001, hitT + 0.52);
    thud.connect(tGain);
    tGain.connect(out);
    thud.start(hitT);
    thud.stop(hitT + 0.55);
  }

  // 6. DESTREZA: Lâmina cortando o vento duas vezes em altíssima velocidade
  public playSkillDestreza() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Dois cortes supersônicos de vento e lâmina (t + 0.10s e t + 0.42s)
    [0.10, 0.42].forEach((slashStart, idx) => {
      const sTime = t + slashStart;
      const dur = 0.26;
      const bufSize = Math.floor(this.ctx!.sampleRate * dur);
      const buf = this.ctx!.createBuffer(1, bufSize, this.ctx!.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const wind = this.ctx!.createBufferSource();
      wind.buffer = buf;
      const bp = this.ctx!.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(5.5, sTime);
      bp.frequency.setValueAtTime(idx === 0 ? 900 : 1200, sTime);
      bp.frequency.exponentialRampToValueAtTime(3600, sTime + 0.09);
      bp.frequency.exponentialRampToValueAtTime(420, sTime + dur);

      const wGain = this.ctx!.createGain();
      wGain.gain.setValueAtTime(0.001, sTime);
      wGain.gain.linearRampToValueAtTime(0.35, sTime + 0.04);
      wGain.gain.exponentialRampToValueAtTime(0.001, sTime + dur);

      wind.connect(bp);
      bp.connect(wGain);
      wGain.connect(out);
      wind.start(sTime);
      wind.stop(sTime + dur + 0.02);

      // Assobio afiado do aço cortando o ar
      const blade = this.ctx!.createOscillator();
      const bGain = this.ctx!.createGain();
      blade.type = 'triangle';
      blade.frequency.setValueAtTime(idx === 0 ? 1480 : 1860, sTime);
      blade.frequency.exponentialRampToValueAtTime(340, sTime + 0.20);
      bGain.gain.setValueAtTime(0.22, sTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.22);
      blade.connect(bGain);
      bGain.connect(out);
      blade.start(sTime);
      blade.stop(sTime + 0.24);
    });
  }

  // 7. VOTO DAS ESTRELAS: Esfera cósmica estelar cintilante
  public playSkillVotoEstrelas() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Ressonância esférica da barreira cósmica
    const dome = this.ctx.createOscillator();
    const dGain = this.ctx.createGain();
    dome.type = 'sine';
    dome.frequency.setValueAtTime(220, t);
    dome.frequency.exponentialRampToValueAtTime(440, t + 0.65);
    dGain.gain.setValueAtTime(0.001, t);
    dGain.gain.linearRampToValueAtTime(0.22, t + 0.2);
    dGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    dome.connect(dGain);
    dGain.connect(out);
    dome.start(t);
    dome.stop(t + 1.55);

    // B) Constelação de estrelas cintilando (arpejo cristalino)
    const starNotes = [587.33, 880, 1174.66, 1318.5, 1760, 2093, 2637];
    starNotes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const st = t + 0.08 + i * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.11, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.45);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 0.48);
    });
  }

  // 8. VOTO DO SILÊNCIO: Selo gigante arcano trancando e silenciando o campo
  public playSkillVotoSilencio() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Badalada solene de sino arcano + queda de frequência (vácuo de silêncio)
    const bellFreqs = [196.0, 293.66, 392.0];
    bellFreqs.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.45, t + 1.25);
      g.gain.setValueAtTime(0.20, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 1.4);
    });

    // B) Impacto pesado do Selo Gigante cravando na mesa (t + 0.42s)
    const sealTime = t + 0.42;
    const slam = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    slam.type = 'sine';
    slam.frequency.setValueAtTime(150, sealTime);
    slam.frequency.exponentialRampToValueAtTime(28, sealTime + 0.65);
    sGain.gain.setValueAtTime(0.42, sealTime);
    sGain.gain.exponentialRampToValueAtTime(0.001, sealTime + 0.72);
    slam.connect(sGain);
    sGain.connect(out);
    slam.start(sealTime);
    slam.stop(sealTime + 0.75);
  }

  // 9. SABEDORIA CÓSMICA: Aura astral de imunidade e mandala cósmica
  public playSkillSabedoriaCosmica() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    const cosmicChord = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    cosmicChord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const st = t + idx * 0.08;
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.11, st + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, st + 1.15);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 1.2);
    });
  }

  // 10. CHAMADO DA VITÓRIA: Fanfarra triunfal + 3 portais de convocação em sequência
  public playSkillChamadoVitoria() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    const fanfare = [329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const st = t + idx * 0.09;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.15, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.65);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 0.7);
    });

    // 3 impactos de invocação nas posições aliadas
    [0.25, 0.55, 0.85].forEach((offset) => {
      const thud = this.ctx!.createOscillator();
      const tg = this.ctx!.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(185, t + offset);
      thud.frequency.exponentialRampToValueAtTime(42, t + offset + 0.25);
      tg.gain.setValueAtTime(0.32, t + offset);
      tg.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.28);
      thud.connect(tg);
      tg.connect(out);
      thud.start(t + offset);
      thud.stop(t + offset + 0.3);
    });
  }

  // 11. FOME INSACIÁVEL: Pulsação visceral sanguínea + absorção vampírica
  public playSkillFomeInsaciavel() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Dois batimentos cardíacos profundos + sucção carmesim
    [0.0, 0.36].forEach((beat) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, t + beat);
      osc.frequency.exponentialRampToValueAtTime(32, t + beat + 0.28);
      g.gain.setValueAtTime(0.4, t + beat);
      g.gain.exponentialRampToValueAtTime(0.001, t + beat + 0.32);
      osc.connect(g);
      g.connect(out);
      osc.start(t + beat);
      osc.stop(t + beat + 0.35);
    });

    // Sifão sanguíneo convergente
    const siphon = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    siphon.type = 'sawtooth';
    siphon.frequency.setValueAtTime(140, t + 0.15);
    siphon.frequency.exponentialRampToValueAtTime(620, t + 0.95);
    siphon.frequency.exponentialRampToValueAtTime(180, t + 1.45);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, t);
    sGain.gain.setValueAtTime(0.001, t + 0.15);
    sGain.gain.linearRampToValueAtTime(0.18, t + 0.75);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    siphon.connect(lp);
    lp.connect(sGain);
    sGain.connect(out);
    siphon.start(t + 0.15);
    siphon.stop(t + 1.55);
  }

  // 12. GRÃO-MESTRE: Giro de 3 espadas em estrela + cruzamento triplo metálico letal
  public playSkillGraoMestre() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Giro acelerado das 3 lâminas no ar
    [0.0, 0.14, 0.26, 0.36, 0.44].forEach((whirl, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420 + i * 110, t + whirl);
      osc.frequency.exponentialRampToValueAtTime(180, t + whirl + 0.11);
      g.gain.setValueAtTime(0.16, t + whirl);
      g.gain.exponentialRampToValueAtTime(0.001, t + whirl + 0.12);
      osc.connect(g);
      g.connect(out);
      osc.start(t + whirl);
      osc.stop(t + whirl + 0.13);
    });

    // Cruzamento triplo de aço (t + 0.54s)
    const crossT = t + 0.54;
    [1320, 1980, 2790, 3720, 4800].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, crossT);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, crossT + 0.9);
      g.gain.setValueAtTime(0.20 / (1 + idx * 0.4), crossT);
      g.gain.exponentialRampToValueAtTime(0.001, crossT + 0.85);
      osc.connect(g);
      g.connect(out);
      osc.start(crossT);
      osc.stop(crossT + 0.92);
    });
  }

  // 13. JURISDIÇÃO DE SANIEL: Raio divino celestial caindo do céu e silenciando o alvo
  public playSkillJurisdicaoSaniel() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Estrondo do raio divino
    const dur = 1.4;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const thunder = this.ctx.createBufferSource();
    thunder.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.setValueAtTime(3.0, t);
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(160, t + dur);

    const tGain = this.ctx.createGain();
    tGain.gain.setValueAtTime(0.42, t);
    tGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    thunder.connect(bp);
    bp.connect(tGain);
    tGain.connect(out);
    thunder.start(t);
    thunder.stop(t + dur + 0.02);

    // Acorde celestial de julgamento de Saniel
    [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 1.25);
      g.gain.setValueAtTime(0.14, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      osc.connect(g);
      g.connect(out);
      osc.start(t + 0.08);
      osc.stop(t + 1.35);
    });
  }

  // 14. LETARGIA LUNAR: Feixes suaves de luz da lua induzindo sono profundo
  public playSkillLetargiaLunar() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Arpejo descendente onírico de luar
    const lullaby = [1318.5, 1174.66, 987.77, 880.0, 783.99, 659.25, 523.25];
    lullaby.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const st = t + i * 0.16;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.12, st + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.65);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 0.7);
    });
  }

  // 15. SOBERANIA: Honraria da Realeza (Acorde Imperial + Investidura Real)
  public playSkillSoberania() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    const royalChord = [261.63, 329.63, 392.0, 523.25, 783.99];
    royalChord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2100, t);
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      g.gain.setValueAtTime(0.001, t + idx * 0.05);
      g.gain.linearRampToValueAtTime(0.14, t + idx * 0.05 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
      osc.connect(lp);
      lp.connect(g);
      g.connect(out);
      osc.start(t + idx * 0.05);
      osc.stop(t + 1.5);
    });
  }

  // 16. CONCESSÃO DIVINA: Grande brilho divino + bater de asas de Arcanjo
  public playSkillConcessaoDivina() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Bater majestoso de asas de Arcanjo (ruído filtrado suave)
    const dur = 0.55;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const wing = this.ctx.createBufferSource();
    wing.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(420, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + dur);
    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.001, t);
    wGain.gain.linearRampToValueAtTime(0.28, t + 0.12);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    wing.connect(lp);
    lp.connect(wGain);
    wGain.connect(out);
    wing.start(t);
    wing.stop(t + dur + 0.02);

    // B) Coro celestial dourado de Ressurreição
    const choir = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
    choir.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      g.gain.setValueAtTime(0.001, t + idx * 0.06);
      g.gain.linearRampToValueAtTime(0.12, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.65);
      osc.connect(g);
      g.connect(out);
      osc.start(t + idx * 0.06);
      osc.stop(t + 1.7);
    });
  }

  // 16B. RESSURREIÇÃO ATIVADA: Pulso de ruptura da morte + asas celestiais + harpa dourada e coro triunfante
  public playRessurreicaoRevive() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Pulso grave de ruptura (morte desafiada)
    const pulse = this.ctx.createOscillator();
    const pulseGain = this.ctx.createGain();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(140, t);
    pulse.frequency.exponentialRampToValueAtTime(52, t + 0.18);
    pulseGain.gain.setValueAtTime(0.001, t);
    pulseGain.gain.linearRampToValueAtTime(0.28, t + 0.025);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    pulse.connect(pulseGain);
    pulseGain.connect(out);
    pulse.start(t);
    pulse.stop(t + 0.26);

    // B) Sopro radiante das asas de arcanjo se abrindo
    const dur = 0.72;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const wing = this.ctx.createBufferSource();
    wing.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(320, t + 0.12);
    bp.frequency.exponentialRampToValueAtTime(1150, t + 0.42);
    bp.frequency.exponentialRampToValueAtTime(420, t + 0.12 + dur);
    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.001, t + 0.12);
    wGain.gain.linearRampToValueAtTime(0.22, t + 0.28);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + dur);
    wing.connect(bp);
    bp.connect(wGain);
    wGain.connect(out);
    wing.start(t + 0.12);
    wing.stop(t + 0.14 + dur);

    // C) Arpejo ascendente de harpa divina
    const harpNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    harpNotes.forEach((freq, idx) => {
      const st = t + 0.14 + idx * 0.065;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.14, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.65);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 0.68);
    });

    // D) Coro celestial triunfante sustentado (acorde maior luminoso)
    const choir = [261.63, 329.63, 392.0, 523.25, 659.25, 1046.5];
    choir.forEach((freq, idx) => {
      const st = t + 0.24 + idx * 0.035;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.095, st + 0.26);
      g.gain.exponentialRampToValueAtTime(0.001, st + 1.55);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 1.6);
    });
  }

  // 17. ESCOLHIDO DAS ESTRELAS: Estrelas mágicas convergindo e incorporando a carta para o Nível 2
  public playSkillEscolhidoEstrelas() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    const starScale = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.5, 1567.98, 2093.0];
    starScale.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const st = t + idx * 0.09;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, st + 0.28);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.13, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.42);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 0.45);
    });
  }

  // 18. VOTO DO ABSOLUTO: Buraco negro gravitacional consumindo e obliterando a carta
  public playSkillVotoAbsoluto() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Singularidade gravitacional (varredura descendente profunda + colapso)
    const sing = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    sing.type = 'sawtooth';
    sing.frequency.setValueAtTime(280, t);
    sing.frequency.exponentialRampToValueAtTime(42, t + 1.25);
    sing.frequency.exponentialRampToValueAtTime(18, t + 1.85);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 1.8);
    sGain.gain.setValueAtTime(0.001, t);
    sGain.gain.linearRampToValueAtTime(0.38, t + 0.35);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
    sing.connect(lp);
    lp.connect(sGain);
    sGain.connect(out);
    sing.start(t);
    sing.stop(t + 1.95);

    // B) Implosão do Horizonte de Eventos (t + 1.05s)
    const implT = t + 1.05;
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(165, implT);
    sub.frequency.exponentialRampToValueAtTime(22, implT + 0.65);
    subG.gain.setValueAtTime(0.45, implT);
    subG.gain.exponentialRampToValueAtTime(0.001, implT + 0.72);
    sub.connect(subG);
    subG.connect(out);
    sub.start(implT);
    sub.stop(implT + 0.75);
  }

  // 19. VETO DO INDÔMITO: Martelo de Tribunal Divino sentenciando e vetando a habilidade
  public playSkillVetoIndomito() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Descida rápida do Martelo do Tribunal
    const whoosh = this.ctx.createOscillator();
    const wG = this.ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(520, t);
    whoosh.frequency.exponentialRampToValueAtTime(120, t + 0.28);
    wG.gain.setValueAtTime(0.18, t);
    wG.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    whoosh.connect(wG);
    wG.connect(out);
    whoosh.start(t);
    whoosh.stop(t + 0.32);

    // B) BATIDA COLOSSAL DO MARTELO DE SENTENÇA (t + 0.28s)
    const gavelT = t + 0.28;
    const slam = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    slam.type = 'sine';
    slam.frequency.setValueAtTime(195, gavelT);
    slam.frequency.exponentialRampToValueAtTime(28, gavelT + 0.62);
    sGain.gain.setValueAtTime(0.48, gavelT);
    sGain.gain.exponentialRampToValueAtTime(0.001, gavelT + 0.68);
    slam.connect(sGain);
    sGain.connect(out);
    slam.start(gavelT);
    slam.stop(gavelT + 0.72);

    // Ressonância metálica/mármore do Tribunal Divino
    [880, 1318.5, 1760, 2637].forEach((freq, idx) => {
      const ring = this.ctx!.createOscillator();
      const rg = this.ctx!.createGain();
      ring.type = 'triangle';
      ring.frequency.setValueAtTime(freq, gavelT);
      rg.gain.setValueAtTime(0.18 / (idx + 1), gavelT);
      rg.gain.exponentialRampToValueAtTime(0.001, gavelT + 0.95);
      ring.connect(rg);
      rg.connect(out);
      ring.start(gavelT);
      ring.stop(gavelT + 1.0);
    });
  }

  // 20. FLECHA ELÉTRICA: Arco de plasma disparando uma flecha de eletricidade que atinge o alvo
  public playSkillFlechaEletrica() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Tensão da corda de arco elétrico e disparo supersônico (0 -> 0.32s)
    const bow = this.ctx.createOscillator();
    const bowG = this.ctx.createGain();
    bow.type = 'sawtooth';
    bow.frequency.setValueAtTime(220, t);
    bow.frequency.exponentialRampToValueAtTime(1480, t + 0.18);
    bow.frequency.exponentialRampToValueAtTime(340, t + 0.34);
    bowG.gain.setValueAtTime(0.001, t);
    bowG.gain.linearRampToValueAtTime(0.24, t + 0.08);
    bowG.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    bow.connect(bowG);
    bowG.connect(out);
    bow.start(t);
    bow.stop(t + 0.38);

    // B) Impacto elétrico fulminante no alvo (t + 0.30s)
    const hitT = t + 0.30;
    const dur = 0.75;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.35 ? 1 : 0.15);
    }

    const zap = this.ctx.createBufferSource();
    zap.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2200, hitT);
    bp.frequency.exponentialRampToValueAtTime(680, hitT + dur);
    bp.Q.setValueAtTime(3.0, hitT);

    const zG = this.ctx.createGain();
    zG.gain.setValueAtTime(0.42, hitT);
    zG.gain.exponentialRampToValueAtTime(0.001, hitT + dur);
    zap.connect(bp);
    bp.connect(zG);
    zG.connect(out);
    zap.start(hitT);
    zap.stop(hitT + dur + 0.02);

    // Sub-impacto de trovão
    const sub = this.ctx.createOscillator();
    const sG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, hitT);
    sub.frequency.exponentialRampToValueAtTime(32, hitT + 0.55);
    sG.gain.setValueAtTime(0.38, hitT);
    sG.gain.exponentialRampToValueAtTime(0.001, hitT + 0.6);
    sub.connect(sG);
    sG.connect(out);
    sub.start(hitT);
    sub.stop(hitT + 0.62);
  }

  // 21. FAGULHA ESTELAR: Duas estrelas cadentes atingindo o alvo sequencialmente
  public playSkillFagulhaEstelar() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Disparo sequencial das 2 Estrelas Cadentes (t + 0.08s e t + 0.44s)
    [0.08, 0.44].forEach((offset, idx) => {
      const st = t + offset;

      // Assobio cintilante da estrela cadente cruzando o céu
      const star = this.ctx!.createOscillator();
      const sGain = this.ctx!.createGain();
      star.type = 'sine';
      star.frequency.setValueAtTime(idx === 0 ? 1760 : 2093, st);
      star.frequency.exponentialRampToValueAtTime(587.33, st + 0.28);
      sGain.gain.setValueAtTime(0.001, st);
      sGain.gain.linearRampToValueAtTime(0.24, st + 0.04);
      sGain.gain.exponentialRampToValueAtTime(0.001, st + 0.30);
      star.connect(sGain);
      sGain.connect(out);
      star.start(st);
      star.stop(st + 0.32);

      // Impacto estelar cristalino no alvo (st + 0.26s)
      const impT = st + 0.26;
      const chord = idx === 0 ? [880, 1318.5, 1760] : [1046.5, 1567.98, 2093];
      chord.forEach((f, i) => {
        const chime = this.ctx!.createOscillator();
        const cg = this.ctx!.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(f, impT);
        cg.gain.setValueAtTime(0.16 / (i + 1), impT);
        cg.gain.exponentialRampToValueAtTime(0.001, impT + 0.45);
        chime.connect(cg);
        cg.connect(out);
        chime.start(impT);
        chime.stop(impT + 0.48);
      });
    });
  }

  // 22. ROCHEDO: Uma grande rocha mágica telúrica esmagando o alvo
  public playSkillRochedo() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    // A) Levitação e queda pesada da Grande Rocha Mágica (0 -> 0.36s)
    const fall = this.ctx.createOscillator();
    const fG = this.ctx.createGain();
    fall.type = 'sawtooth';
    fall.frequency.setValueAtTime(180, t);
    fall.frequency.exponentialRampToValueAtTime(48, t + 0.36);
    fG.gain.setValueAtTime(0.001, t);
    fG.gain.linearRampToValueAtTime(0.26, t + 0.12);
    fG.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    fall.connect(fG);
    fG.connect(out);
    fall.start(t);
    fall.stop(t + 0.40);

    // B) IMPACTO SÍSMICO COLOSSAL DA ROCHA MÁGICA (t + 0.34s)
    const hitT = t + 0.34;
    const quake = this.ctx.createOscillator();
    const qG = this.ctx.createGain();
    quake.type = 'sine';
    quake.frequency.setValueAtTime(135, hitT);
    quake.frequency.exponentialRampToValueAtTime(24, hitT + 0.75);
    qG.gain.setValueAtTime(0.50, hitT);
    qG.gain.exponentialRampToValueAtTime(0.001, hitT + 0.80);
    quake.connect(qG);
    qG.connect(out);
    quake.start(hitT);
    quake.stop(hitT + 0.82);

    // Estilhaços de pedra e cristal rúnico
    const dur = 0.65;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const rockNoise = this.ctx.createBufferSource();
    rockNoise.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, hitT);
    lp.frequency.exponentialRampToValueAtTime(140, hitT + dur);

    const rG = this.ctx.createGain();
    rG.gain.setValueAtTime(0.42, hitT);
    rG.gain.exponentialRampToValueAtTime(0.001, hitT + dur);
    rockNoise.connect(lp);
    lp.connect(rG);
    rG.connect(out);
    rockNoise.start(hitT);
    rockNoise.stop(hitT + dur + 0.02);
  }

  // 23. APOTEOSE: Coro dourado ascendente concedendo classe DIVINO
  public playSkillApoteose() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.055);
      osc.frequency.exponentialRampToValueAtTime(f * 1.015, t + idx * 0.055 + 0.6);
      g.gain.setValueAtTime(0.001, t + idx * 0.055);
      g.gain.linearRampToValueAtTime(0.16, t + idx * 0.055 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.65);
      osc.connect(g);
      g.connect(out);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.68);
    });
  }

  // 24. TOQUE ÍGNEO: Sopro de forja flamejante concedendo classe FOGO
  public playSkillToqueIgneo() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.65);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(340, t);
    bp.frequency.exponentialRampToValueAtTime(1750, t + 0.25);
    bp.frequency.exponentialRampToValueAtTime(420, t + 0.65);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.67);
    const ember = this.ctx.createOscillator();
    const eg = this.ctx.createGain();
    ember.type = 'sawtooth';
    ember.frequency.setValueAtTime(190, t + 0.05);
    ember.frequency.exponentialRampToValueAtTime(460, t + 0.45);
    eg.gain.setValueAtTime(0.14, t + 0.05);
    eg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    ember.connect(eg);
    eg.connect(out);
    ember.start(t + 0.05);
    ember.stop(t + 0.52);
  }

  // 25. FORÇA DA NATUREZA: Ressonância telúrica de cristal e raízes
  public playSkillForcaNatureza() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    const low = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    low.type = 'triangle';
    low.frequency.setValueAtTime(110, t);
    low.frequency.exponentialRampToValueAtTime(68, t + 0.55);
    lg.gain.setValueAtTime(0.28, t);
    lg.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
    low.connect(lg);
    lg.connect(out);
    low.start(t);
    low.stop(t + 0.6);
    [440, 554.37, 659.25].forEach((f, idx) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + 0.12 + idx * 0.07);
      g.gain.setValueAtTime(0.14, t + 0.12 + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55 + idx * 0.07);
      o.connect(g);
      g.connect(out);
      o.start(t + 0.12 + idx * 0.07);
      o.stop(t + 0.58 + idx * 0.07);
    });
  }

  // 26. ESTÁTICO: Bobina voltaica concedendo classe ELÉTRICO
  public playSkillEstatico() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.14, 0.28].forEach((delay, idx) => {
      const st = t + delay;
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(980 + idx * 240, st);
      o.frequency.exponentialRampToValueAtTime(320, st + 0.16);
      g.gain.setValueAtTime(0.16, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
      o.connect(g);
      g.connect(out);
      o.start(st);
      o.stop(st + 0.2);
    });
  }

  // 27. NEVASCA: Carrilhão glacial concedendo classe GELO
  public playSkillNevasca() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    [1318.51, 1567.98, 1975.53, 2637.02].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.06);
      g.gain.setValueAtTime(0.12, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.48);
      o.connect(g);
      g.connect(out);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.5);
    });
  }

  // 28. ENCANTAR: Acorde arcano cintilante concedendo classe MÁGICO
  public playSkillEncantar() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, t + i * 0.05);
      g.gain.setValueAtTime(0.13, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.5);
      o.connect(g);
      g.connect(out);
      o.start(t + i * 0.05);
      o.stop(t + i * 0.05 + 0.52);
    });
  }

  // 29. OCEÂNICO: Maré profunda e harpa aquática concedendo classe ÁGUA
  public playSkillOceanico() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.72);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(420, t);
    lp.frequency.exponentialRampToValueAtTime(1400, t + 0.34);
    lp.frequency.exponentialRampToValueAtTime(360, t + 0.72);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.75);
    [493.88, 659.25, 987.77].forEach((f, idx) => {
      const o = this.ctx!.createOscillator();
      const og = this.ctx!.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + 0.1 + idx * 0.08);
      og.gain.setValueAtTime(0.13, t + 0.1 + idx * 0.08);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      o.connect(og);
      og.connect(out);
      o.start(t + 0.1 + idx * 0.08);
      o.stop(t + 0.68);
    });
  }

  // 30. CENTELHA: Feixe sagrado elétrico dourado-branco
  public playSkillCentelha() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    const beam = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    beam.type = 'sawtooth';
    beam.frequency.setValueAtTime(1560, t);
    beam.frequency.exponentialRampToValueAtTime(280, t + 0.36);
    bg.gain.setValueAtTime(0.2, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    beam.connect(bg);
    bg.connect(out);
    beam.start(t);
    beam.stop(t + 0.4);
    [783.99, 1174.66, 1567.98].forEach((f, i) => {
      const ch = this.ctx!.createOscillator();
      const cg = this.ctx!.createGain();
      ch.type = 'sine';
      ch.frequency.setValueAtTime(f, t + 0.06 + i * 0.05);
      cg.gain.setValueAtTime(0.14, t + 0.06 + i * 0.05);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      ch.connect(cg);
      cg.connect(out);
      ch.start(t + 0.06 + i * 0.05);
      ch.stop(t + 0.55);
    });
  }

  // 31. FILHO DA LUZ: Grande coral angélico + restauração plena
  public playSkillFilhoDaLuz() {
    this.playSkillConcessaoDivina();
  }

  // 32. DESTINO FATAL: Corte fúnebre de execução imediata
  public playSkillDestinoFatal() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;
    const slash = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    slash.type = 'sawtooth';
    slash.frequency.setValueAtTime(640, t);
    slash.frequency.exponentialRampToValueAtTime(52, t + 0.45);
    sg.gain.setValueAtTime(0.28, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    slash.connect(sg);
    sg.connect(out);
    slash.start(t);
    slash.stop(t + 0.5);
    const bell = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(293.66, t + 0.14);
    bell.frequency.exponentialRampToValueAtTime(146.83, t + 0.85);
    bg.gain.setValueAtTime(0.22, t + 0.14);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    bell.connect(bg);
    bg.connect(out);
    bell.start(t + 0.14);
    bell.stop(t + 0.92);
  }

  public playUnitVfx(
    type:
      | 'fernando_ember'
      | 'vilma_fire_wave'
      | 'virtus_impetus'
      | 'salazar_torpor'
      | 'inariel_fire_hit'
      | 'bor_phoenix_rebirth'
      | 'helio_solar_flare'
      | 'o_sol_heal_helio'
      | 'o_sol_lvl2_oblit_disintegrate'
      | 'o_sol_lvl2_drain'
      | 'fanx_aqua_blessing'
      | 'cristalys_aqua_heal'
      | 'vanusa_reveal'
      | 'krust_crypt_reopen'
      | 'glauco_snowflake_def'
      | 'kore_death_blast'
      | 'juci_dragon_breath'
      | 'bonetrus_frost_fog'
      | 'bonetrus_lvl2_solo_slash'
      | 'bonetrus_lamina_attach'
      | 'finn_hp_boost'
      | 'kyn_bonk'
      | 'mara_potion_power'
      | 'tyn_lightning_dodge'
      | 'atormentador_fusion'
      | 'atormentador_stun_bolt'
      | 'karaty_chain_lightning'
      | 'barao_well_lvl2_bolts'
      | 'mipo_purple_hp'
      | 'karlo_death_shockwave'
      | 'mesmerino_mirror'
      | 'rainha_liz_power_decree'
      | 'licia_lvl2_light_wave'
      | 'philio_soul_orb'
      | 'tiryu_self_harm'
      | 'zyk_purple_coin'
      | 'lunario_sleep_beam'
      | 'lunario_lvl2_consume'
      | 'a_lua_heal_lunario'
      | 'a_lua_lvl2_sleep'
      | 'a_lua_lvl2_drain'
      | 'a_lua_lunario_obliterate'
      | 'pcie_shield_block'
      | 'wyr_dragon_heal'
      | 'rei_mauricio_decree'
      | 'saniel_lvl2_drain'
      | 'ambroz_alvorada_crit'
      | 'bia_furto_feerico'
      | 'nulio_luz_revigorante'
      | 'lucent_purificacao_ardente'
      | 'mavie_ceifa_luminosa'
      | 'falanx_onda_luz'
      | 'kamui_chamado_sagrado'
      | 'torvyx_visao_celestial'
      | 'umael_imposicao_duelo'
      | 'polus_golpe_penetrante'
      | 'vergor_metamorfo_divino'
      | 'xeno_julgamento_paralizante'
      | 'zael_bencao_ressurreicao'
      | 'zael_exilio_crepusculo'
      | 'faleziel_revelacao_angiris'
      | 'kaliel_bencao_global'
      | 'kaliel_comunhao_angiris'
      | 'saniel_ascensao_lvl2'
      | 'targor_praga_breath'
      | 'atlaziel_fallen_execute'
      | 'barelio_chains_imprison'
      | 'barelio_usurp_tick'
      | 'corte_das_fadas_miracle'
      | 'gangnyr_bleed_slash'
      | 'gangnyr_hemorrhage_burst'
      | 'hamelia_putrid_corrosion'
      | 'celia_frost_bonus'
      | 'celia_ice_barrier'
      | 'vilma_fire_bonus'
      | 'vilma_fire_barrier'
      | 'mago_uhr_draw_arcana'
      | 'gough_arrow_forge'
  ) {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;
    const t = this.ctx.currentTime;

    const tone = (
      freqStart: number,
      freqEnd: number,
      dur: number,
      wave: OscillatorType = 'sine',
      vol = 0.18,
      delay = 0
    ) => {
      if (!this.ctx) return;
      const st = t + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(Math.max(20, freqStart), st);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), st + dur);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(vol, st + Math.min(0.04, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.001, st + dur);
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + dur + 0.02);
    };

    const noise = (dur: number, filterType: BiquadFilterType, freqStart: number, freqEnd: number, vol = 0.22, delay = 0) => {
      if (!this.ctx) return;
      const st = t + delay;
      const bufSize = Math.max(256, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) ch[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const flt = this.ctx.createBiquadFilter();
      flt.type = filterType;
      flt.frequency.setValueAtTime(freqStart, st);
      flt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), st + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(vol, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, st + dur);
      src.connect(flt);
      flt.connect(g);
      g.connect(out);
      src.start(st);
      src.stop(st + dur + 0.02);
    };

    switch (type) {
      case 'fernando_ember':
      case 'helio_solar_flare':
      case 'virtus_impetus': {
        noise(0.45, 'bandpass', 1400, 320, 0.22);
        tone(220, 520, 0.25, 'sawtooth', 0.14);
        tone(440, 220, 0.35, 'triangle', 0.16, 0.12);
        break;
      }
      case 'inariel_fire_hit': {
        noise(0.5, 'bandpass', 1800, 420, 0.24);
        tone(330, 740, 0.28, 'sawtooth', 0.15);
        [659.25, 987.77, 1318.5].forEach((f, idx) => tone(f, f * 1.03, 0.32, 'sine', 0.11, 0.08 + idx * 0.04));
        break;
      }
      case 'vilma_fire_wave': {
        noise(0.68, 'lowpass', 1800, 220, 0.30);
        tone(160, 75, 0.55, 'sawtooth', 0.18);
        break;
      }
      case 'bor_phoenix_rebirth': {
        // Phase 1: Ash implosion & volcanic ember rumble
        noise(0.28, 'bandpass', 1800, 420, 0.16, 0);
        tone(82, 46, 0.34, 'triangle', 0.22, 0);
        // Phase 2: Massive blazing fire pillar whoosh + soaring Phoenix screech
        noise(1.15, 'bandpass', 280, 2650, 0.32, 0.18);
        noise(0.55, 'lowpass', 1600, 240, 0.26, 0.22);
        // Iconic Phoenix cry (expressive rising-then-soaring harmonic glide)
        tone(1120, 2180, 0.32, 'sawtooth', 0.13, 0.22);
        tone(2180, 1460, 0.48, 'triangle', 0.16, 0.52);
        tone(1680, 2940, 0.28, 'sine', 0.11, 0.24);
        tone(2940, 1980, 0.45, 'sine', 0.10, 0.50);
        // Phase 3: Flaming wingbeat whooshes + triumphant D-major blazing chord
        noise(0.42, 'bandpass', 500, 1500, 0.20, 0.62);
        noise(0.38, 'bandpass', 420, 1250, 0.16, 1.05);
        [293.66, 440.0, 587.33, 739.99, 880.0].forEach((f, idx) => {
          tone(f, f * 1.012, 1.05, idx < 2 ? 'sawtooth' : 'triangle', idx < 2 ? 0.11 : 0.14, 0.38 + idx * 0.055);
        });
        // Shimmering rising ember sparks
        [1174.66, 1479.98, 1760.0, 2349.32].forEach((f, idx) => {
          tone(f, f * 1.04, 0.42, 'sine', 0.075, 0.78 + idx * 0.09);
        });
        break;
      }
      case 'o_sol_heal_helio':
      case 'wyr_dragon_heal': {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => tone(f, f * 1.03, 0.38, 'sine', 0.14, idx * 0.07));
        break;
      }
      case 'o_sol_lvl2_oblit_disintegrate': {
        noise(1.1, 'highpass', 300, 2800, 0.28);
        tone(220, 42, 0.95, 'sawtooth', 0.22);
        tone(880, 110, 0.9, 'sine', 0.16, 0.15);
        break;
      }
      case 'o_sol_lvl2_drain':
      case 'a_lua_lvl2_drain':
      case 'philio_soul_orb': {
        tone(type === 'a_lua_lvl2_drain' ? 520 : 640, 210, 0.48, 'sine', 0.17);
        tone(type === 'a_lua_lvl2_drain' ? 240 : 320, 720, 0.44, 'triangle', 0.16, 0.16);
        if (type === 'a_lua_lvl2_drain') {
          tone(110, 55, 0.35, 'sawtooth', 0.14, 0.08);
        }
        break;
      }
      case 'saniel_lvl2_drain': {
        tone(720, 240, 0.5, 'sine', 0.18);
        tone(360, 960, 0.48, 'triangle', 0.16, 0.14);
        [783.99, 1174.66].forEach((f, i) => tone(f, f * 1.04, 0.38, 'sine', 0.12, 0.22 + i * 0.06));
        break;
      }
      case 'fanx_aqua_blessing': {
        // Cascata aquática suave + acorde angelical cristalino sincronizado (~1.05s)
        noise(0.68, 'bandpass', 620, 2100, 0.16, 0.02);
        noise(0.35, 'highpass', 1400, 3200, 0.09, 0.36);
        [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98].forEach((f, idx) =>
          tone(f, f * 1.03, 0.48, idx % 2 === 0 ? 'sine' : 'triangle', 0.125, idx * 0.065)
        );
        tone(1046.5, 1318.5, 0.42, 'sine', 0.11, 0.56);
        break;
      }
      case 'cristalys_aqua_heal':
      case 'vanusa_reveal': {
        noise(0.45, 'bandpass', 900, 1600, 0.14);
        [587.33, 739.99, 880, 1174.66].forEach((f, idx) => tone(f, f * 1.06, 0.34, 'sine', 0.13, idx * 0.06));
        break;
      }
      case 'krust_crypt_reopen': {
        noise(0.6, 'lowpass', 420, 120, 0.26);
        tone(140, 78, 0.55, 'sawtooth', 0.16);
        tone(293.66, 440, 0.35, 'triangle', 0.12, 0.2);
        break;
      }
      case 'glauco_snowflake_def': {
        tone(1318.5, 1975.5, 0.28, 'sine', 0.14);
        tone(987.77, 1480, 0.32, 'triangle', 0.12, 0.1);
        break;
      }
      case 'kore_death_blast':
      case 'juci_dragon_breath':
      case 'bonetrus_frost_fog': {
        noise(0.7, 'highpass', 1100, 2600, 0.24);
        tone(520, 180, 0.48, 'triangle', 0.16);
        break;
      }
      case 'bonetrus_lvl2_solo_slash': {
        noise(0.35, 'bandpass', 600, 2600, 0.22);
        tone(220, 680, 0.32, 'triangle', 0.16);
        noise(0.32, 'highpass', 1800, 4600, 0.28, 0.36);
        tone(880, 200, 0.28, 'sawtooth', 0.22, 0.36);
        noise(0.85, 'highpass', 1200, 4200, 0.32, 0.72);
        tone(1040, 140, 0.55, 'sawtooth', 0.22, 0.75);
        tone(140, 48, 0.65, 'sine', 0.28, 0.85);
        break;
      }
      case 'bonetrus_lamina_attach': {
        noise(0.85, 'bandpass', 900, 2600, 0.22);
        tone(440, 880, 0.6, 'triangle', 0.16, 0.1);
        [659.25, 987.77, 1318.5].forEach((f, i) => tone(f, f, 0.5, 'sine', 0.16, 0.68 + i * 0.05));
        break;
      }
      case 'finn_hp_boost':
      case 'mipo_purple_hp': {
        [440, 554.37, 659.25, 880].forEach((f, i) => tone(f, f * 1.02, 0.3, 'triangle', 0.14, i * 0.06));
        break;
      }
      case 'kyn_bonk': {
        tone(280, 95, 0.18, 'triangle', 0.35);
        tone(420, 140, 0.14, 'sine', 0.28, 0.02);
        noise(0.12, 'lowpass', 700, 180, 0.24);
        break;
      }
      case 'mara_potion_power': {
        [520, 740, 980, 1240].forEach((f, i) => tone(f, f * 1.15, 0.14, 'sine', 0.13, i * 0.055));
        break;
      }
      case 'tyn_lightning_dodge': {
        noise(0.22, 'highpass', 2200, 4800, 0.18);
        tone(1400, 480, 0.2, 'sawtooth', 0.14);
        break;
      }
      case 'atormentador_fusion': {
        noise(0.9, 'bandpass', 600, 3200, 0.25);
        tone(180, 720, 0.7, 'sawtooth', 0.18);
        tone(110, 45, 0.65, 'sine', 0.3, 0.68);
        noise(0.45, 'highpass', 1800, 500, 0.32, 0.68);
        break;
      }
      case 'atormentador_stun_bolt':
      case 'karaty_chain_lightning':
      case 'barao_well_lvl2_bolts': {
        noise(0.32, 'highpass', 1600, 3800, 0.24);
        tone(880, 190, 0.28, 'sawtooth', 0.18);
        tone(1320, 260, 0.22, 'square', 0.1, 0.08);
        break;
      }
      case 'karlo_death_shockwave': {
        tone(240, 52, 0.62, 'sawtooth', 0.24);
        noise(0.55, 'bandpass', 900, 220, 0.26);
        break;
      }
      case 'mesmerino_mirror':
      case 'licia_lvl2_light_wave': {
        [587.33, 880, 1174.66, 1567.98].forEach((f, i) => tone(f, f * 1.04, 0.42, 'sine', 0.14, i * 0.06));
        break;
      }
      case 'rainha_liz_power_decree':
      case 'rei_mauricio_decree': {
        [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(f, f, 0.45, 'triangle', 0.15, i * 0.06));
        break;
      }
      case 'salazar_torpor':
      case 'tiryu_self_harm': {
        tone(260, 110, 0.38, 'sawtooth', 0.16);
        noise(0.28, 'lowpass', 650, 180, 0.18);
        break;
      }
      case 'zyk_purple_coin': {
        tone(783.99, 1567.98, 0.32, 'sine', 0.18);
        tone(1174.66, 2349.32, 0.42, 'triangle', 0.14, 0.12);
        break;
      }
      case 'lunario_sleep_beam':
      case 'a_lua_heal_lunario':
      case 'a_lua_lvl2_sleep': {
        [440, 659.25, 987.77].forEach((f, i) => tone(f, f * 0.96, 0.5, 'sine', 0.14, i * 0.09));
        break;
      }
      case 'lunario_lvl2_consume':
      case 'a_lua_lunario_obliterate': {
        tone(620, 220, 0.45, 'triangle', 0.18);
        tone(220, 880, 0.48, 'sine', 0.18, 0.18);
        noise(0.45, 'highpass', 1200, 320, 0.22, 0.35);
        break;
      }
      case 'pcie_shield_block': {
        tone(920, 680, 0.16, 'triangle', 0.22);
        tone(1380, 1020, 0.2, 'sine', 0.16, 0.04);
        break;
      }
      // ---- NOVAS ANIMAÇÕES DIVINAS & ARCANJOS ----
      case 'ambroz_alvorada_crit': {
        tone(440, 880, 0.35, 'triangle', 0.17);
        [587.33, 880, 1174.66].forEach((f, i) => tone(f, f * 1.04, 0.34, 'sine', 0.13, 0.08 + i * 0.05));
        noise(0.22, 'highpass', 2200, 4200, 0.16, 0.12);
        break;
      }
      case 'bia_furto_feerico': {
        [880, 1046.5, 1318.5, 1567.98, 1760].forEach((f, i) => tone(f, f * 1.06, 0.26, 'sine', 0.12, i * 0.05));
        break;
      }
      case 'nulio_luz_revigorante': {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f * 1.03, 0.36, 'sine', 0.14, i * 0.065));
        break;
      }
      case 'lucent_purificacao_ardente': {
        noise(0.48, 'bandpass', 1200, 2800, 0.22);
        tone(740, 1480, 0.28, 'sine', 0.16);
        tone(280, 560, 0.35, 'sawtooth', 0.13, 0.14);
        break;
      }
      case 'mavie_ceifa_luminosa': {
        noise(0.28, 'highpass', 1800, 4200, 0.22);
        tone(680, 240, 0.26, 'sawtooth', 0.17);
        [587.33, 880, 1174.66].forEach((f, i) => tone(f, f * 1.02, 0.34, 'triangle', 0.13, 0.18 + i * 0.05));
        break;
      }
      case 'falanx_onda_luz': {
        tone(329.63, 659.25, 0.48, 'triangle', 0.18);
        [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => tone(f, f * 0.98, 0.42, 'sine', 0.12, 0.05 + i * 0.05));
        noise(0.42, 'bandpass', 900, 2200, 0.16, 0.08);
        break;
      }
      case 'kamui_chamado_sagrado': {
        [440, 587.33, 739.99, 880, 1174.66].forEach((f, i) => tone(f, f * 1.04, 0.4, 'sine', 0.14, i * 0.055));
        break;
      }
      case 'torvyx_visao_celestial': {
        [783.99, 1174.66, 1567.98].forEach((f, i) => tone(f, f * 1.05, 0.38, 'sine', 0.13, i * 0.07));
        tone(392, 784, 0.42, 'triangle', 0.12, 0.04);
        break;
      }
      case 'umael_imposicao_duelo': {
        noise(0.28, 'highpass', 2200, 4600, 0.2);
        tone(520, 320, 0.22, 'sawtooth', 0.16);
        [440, 659.25, 880].forEach((f, i) => tone(f, f, 0.38, 'triangle', 0.14, 0.12 + i * 0.05));
        break;
      }
      case 'polus_golpe_penetrante': {
        tone(587.33, 1760, 0.3, 'triangle', 0.18);
        noise(0.32, 'highpass', 2400, 5200, 0.2, 0.08);
        [659.25, 987.77, 1318.5, 1975.53].forEach((f, i) => tone(f, f, 0.42, 'sine', 0.12, 0.14 + i * 0.05));
        break;
      }
      case 'vergor_metamorfo_divino': {
        [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => tone(f, f * 1.08, 0.38, 'sine', 0.13, i * 0.06));
        noise(0.55, 'bandpass', 700, 2400, 0.18, 0.18);
        break;
      }
      case 'xeno_julgamento_paralizante': {
        noise(0.38, 'highpass', 1800, 4200, 0.24);
        tone(960, 220, 0.3, 'sawtooth', 0.18);
        [659.25, 987.77, 1318.5, 1567.98].forEach((f, i) => tone(f, f * 1.03, 0.34, 'sine', 0.12, 0.22 + i * 0.05));
        break;
      }
      case 'zael_bencao_ressurreicao': {
        noise(0.55, 'bandpass', 500, 1400, 0.16);
        [392, 493.88, 587.33, 783.99, 987.77, 1174.66].forEach((f, i) => tone(f, f * 1.02, 0.55, 'sine', 0.13, i * 0.06));
        break;
      }
      case 'zael_exilio_crepusculo': {
        [783.99, 659.25, 523.25, 392].forEach((f, i) => tone(f, f * 0.94, 0.46, 'sine', 0.13, i * 0.08));
        break;
      }
      case 'faleziel_revelacao_angiris': {
        noise(0.65, 'bandpass', 600, 2800, 0.24);
        tone(220, 880, 0.5, 'triangle', 0.18);
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
          tone(f, f * 1.02, 0.65, 'sine', 0.15, 0.26 + i * 0.06)
        );
        break;
      }
      case 'kaliel_bencao_global':
      case 'kaliel_comunhao_angiris': {
        noise(0.7, 'bandpass', 480, 2200, 0.2);
        [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
          tone(f, f * 1.02, 0.72, i % 2 === 0 ? 'triangle' : 'sine', 0.14, i * 0.065)
        );
        break;
      }
      case 'saniel_ascensao_lvl2': {
        tone(261.63, 523.25, 0.45, 'sawtooth', 0.14);
        [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((f, i) => tone(f, f * 1.03, 0.55, 'sine', 0.14, 0.14 + i * 0.06));
        break;
      }
      // ---- CLASSE SOMBRIO & CORTE DAS FADAS ----
      case 'targor_praga_breath': {
        noise(0.55, 'bandpass', 420, 1400, 0.24);
        tone(190, 72, 0.52, 'sawtooth', 0.2);
        [311.13, 277.18, 233.08].forEach((f, i) => tone(f, f * 0.88, 0.35, 'triangle', 0.14, 0.12 + i * 0.08));
        break;
      }
      case 'atlaziel_fallen_execute': {
        noise(0.45, 'highpass', 1500, 4200, 0.26);
        tone(640, 92, 0.48, 'sawtooth', 0.22);
        [440, 329.63, 220, 146.83].forEach((f, i) => tone(f, f * 0.92, 0.42, 'triangle', 0.15, 0.1 + i * 0.07));
        break;
      }
      case 'barelio_chains_imprison': {
        noise(0.32, 'highpass', 2200, 5200, 0.24);
        [880, 1180, 740, 1340, 620].forEach((f, i) => tone(f, f * 0.72, 0.18, 'square', 0.14, i * 0.075));
        tone(160, 54, 0.58, 'sawtooth', 0.22, 0.28);
        break;
      }
      case 'barelio_usurp_tick': {
        tone(340, 110, 0.32, 'sawtooth', 0.18);
        noise(0.24, 'bandpass', 900, 2600, 0.2);
        [440, 587.33, 783.99].forEach((f, i) => tone(f, f * 1.05, 0.28, 'sine', 0.12, 0.18 + i * 0.05));
        break;
      }
      case 'corte_das_fadas_miracle': {
        [587.33, 739.99, 880, 1174.66, 1479.98, 1760].forEach((f, i) =>
          tone(f, f * 1.04, 0.55, i % 2 === 0 ? 'sine' : 'triangle', 0.15, i * 0.06)
        );
        noise(0.45, 'highpass', 2400, 5400, 0.14, 0.1);
        break;
      }
      case 'gangnyr_bleed_slash': {
        noise(0.28, 'highpass', 1800, 4800, 0.25);
        tone(820, 140, 0.32, 'sawtooth', 0.22);
        [329.63, 246.94, 196].forEach((f, i) => tone(f, f * 0.9, 0.28, 'triangle', 0.14, 0.12 + i * 0.06));
        break;
      }
      case 'gangnyr_hemorrhage_burst': {
        noise(0.55, 'bandpass', 380, 1600, 0.28);
        tone(520, 62, 0.55, 'sawtooth', 0.26);
        [440, 554.37, 659.25, 880].forEach((f, i) => tone(f, f * 1.04, 0.42, 'sine', 0.15, 0.16 + i * 0.055));
        break;
      }
      case 'hamelia_putrid_corrosion': {
        noise(0.52, 'bandpass', 520, 1950, 0.24);
        [369.99, 311.13, 261.63, 207.65].forEach((f, i) =>
          tone(f, f * 0.85, 0.36, i % 2 === 0 ? 'sawtooth' : 'triangle', 0.14, i * 0.08)
        );
        break;
      }
      case 'celia_frost_bonus': {
        noise(0.32, 'highpass', 2400, 4600, 0.14);
        [783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) =>
          tone(f, f * 1.04, 0.28, 'sine', 0.13, i * 0.06)
        );
        break;
      }
      case 'celia_ice_barrier': {
        noise(0.24, 'bandpass', 1800, 4200, 0.18);
        tone(1174.66, 880.0, 0.34, 'triangle', 0.18);
        tone(1760.0, 1318.51, 0.38, 'sine', 0.14, 0.04);
        break;
      }
      case 'vilma_fire_bonus': {
        noise(0.36, 'bandpass', 420, 1700, 0.2);
        [329.63, 440.0, 587.33, 659.25].forEach((f, i) =>
          tone(f, f * 1.08, 0.26, 'sawtooth', 0.1, i * 0.06)
        );
        break;
      }
      case 'vilma_fire_barrier': {
        noise(0.28, 'bandpass', 320, 1450, 0.22);
        tone(220.0, 440.0, 0.32, 'sawtooth', 0.14);
        tone(523.25, 659.25, 0.35, 'triangle', 0.14, 0.05);
        break;
      }
      case 'mago_uhr_draw_arcana': {
        noise(0.26, 'bandpass', 1200, 3200, 0.12);
        [440.0, 554.37, 659.25, 880.0, 1108.73].forEach((f, i) =>
          tone(f, f * 1.03, 0.3, i % 2 === 0 ? 'sine' : 'triangle', 0.11, i * 0.055)
        );
        break;
      }
      case 'gough_arrow_forge': {
        noise(0.24, 'highpass', 1600, 5200, 0.16);
        tone(587.33, 1174.66, 0.22, 'sawtooth', 0.11);
        tone(880.0, 1760.0, 0.24, 'triangle', 0.12, 0.06);
        break;
      }
    }
  }

  // ----------------------------------------------------
  // BAÚ DE PACOTES POR RARIDADE + SORTE 4ª CARTA
  // ----------------------------------------------------
  public playChestRumble(packType: string = 'common') {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    if (packType === 'lucky') {
      // Playful magical fortune roulette chimes pulsing upward
      const rouletteNotes = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      rouletteNotes.forEach((freq, idx) => {
        const start = t + idx * 0.115;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.09);

        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.09 + idx * 0.008, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.11);

        osc.connect(g);
        g.connect(out);
        osc.start(start);
        osc.stop(start + 0.12);
      });
      return;
    }

    const basePitchMap: Record<string, number> = {
      common: 60,
      uncommon: 72,
      rare: 86,
      epic: 55,
      legendary: 65,
    };
    const rattleBaseMap: Record<string, number> = {
      common: 210,
      uncommon: 270,
      rare: 340,
      epic: 295,
      legendary: 320,
    };
    const baseSub = basePitchMap[packType] ?? 62;
    const rattleBase = rattleBaseMap[packType] ?? 240;

    // Deep forged resonance building tension
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = packType === 'rare' ? 'triangle' : 'sawtooth';
    sub.frequency.setValueAtTime(baseSub, t);
    sub.frequency.linearRampToValueAtTime(baseSub * 1.62, t + 0.95);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(packType === 'epic' ? 280 : 190, t);
    filter.frequency.linearRampToValueAtTime(packType === 'legendary' ? 620 : 440, t + 0.95);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.16, t + 0.2);
    subGain.gain.linearRampToValueAtTime(packType === 'legendary' ? 0.28 : 0.22, t + 0.85);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);

    sub.connect(filter);
    filter.connect(subGain);
    subGain.connect(out);
    sub.start(t);
    sub.stop(t + 1.08);

    // Metallic/crystal rattle pulses synced with the accelerating shake
    const rattleOffsets = [0.1, 0.28, 0.44, 0.58, 0.71, 0.82, 0.91];
    rattleOffsets.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = packType === 'rare' || packType === 'epic' ? 'sine' : 'triangle';
      const baseFreq = rattleBase + idx * 42;
      osc.frequency.setValueAtTime(baseFreq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, t + offset + 0.08);

      g.gain.setValueAtTime(0.001, t + offset);
      g.gain.linearRampToValueAtTime(0.065 + idx * 0.011, t + offset + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.085);

      osc.connect(g);
      g.connect(out);
      osc.start(t + offset);
      osc.stop(t + offset + 0.09);
    });
  }

  public playChestOpenBurst(packType: string = 'common', hasLuckyBonus: boolean = false) {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    // 1. Crisp forged latch snap
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(packType === 'legendary' ? 1120 : 900, t);
    snap.frequency.exponentialRampToValueAtTime(175, t + 0.11);
    snapGain.gain.setValueAtTime(0.17, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    snap.connect(snapGain);
    snapGain.connect(out);
    snap.start(t);
    snap.stop(t + 0.13);

    // 2. Radiant shimmer air burst
    const bufLen = Math.floor(ctx.sampleRate * 0.48);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.34));
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(850, t + 0.03);
    noiseFilter.frequency.exponentialRampToValueAtTime(packType === 'legendary' ? 4200 : 3200, t + 0.45);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(packType === 'common' ? 0.14 : 0.21, t + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(out);
    noiseSrc.start(t + 0.03);

    // 3. Rarity-specific musical resolution chord
    const chordsByRarity: Record<string, number[]> = {
      common: [261.63, 329.63, 392.0, 523.25], // C major clean warm triad
      uncommon: [293.66, 369.99, 440.0, 587.33, 739.99], // D major emerald shimmer
      rare: [329.63, 415.3, 493.88, 659.25, 830.61, 987.77], // E major sapphire crystalline
      epic: [246.94, 311.13, 369.99, 493.88, 622.25, 739.99], // B major/arcane lush resonance
      legendary: [293.66, 369.99, 440.0, 587.33, 659.25, 880.0, 1174.66], // Grand royal celestial fanfare
      lucky: hasLuckyBonus
        ? [392.0, 493.88, 587.33, 783.99, 987.77, 1174.66, 1567.98]
        : [349.23, 440.0, 523.25, 698.46, 880.0, 1046.5],
    };
    const chord = chordsByRarity[packType] || chordsByRarity.common;
    const step = packType === 'legendary' || packType === 'lucky' ? 0.05 : 0.06;

    chord.forEach((freq, idx) => {
      const start = t + 0.045 + idx * step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.012, start + 0.65);

      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(packType === 'legendary' ? 0.15 : 0.13, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.72);

      osc.connect(g);
      g.connect(out);
      osc.start(start);
      osc.stop(start + 0.76);
    });
  }

  public playLuckyBonusCard() {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes = [587.33, 783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.018, start + 0.45);

      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.14, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.48);

      osc.connect(g);
      g.connect(out);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  // ----------------------------------------------------
  // ALTERNÂNCIA DE TURNOS (SOM DISTINTO POR JOGADOR)
  // ----------------------------------------------------
  public playTurnChange(nextPlayer: 'player' | 'opponent') {
    const out = this.getOutputNode();
    if (!out || !this.ctx) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    if (nextPlayer === 'player') {
      // Bright ascending forged chime -> unmistakably "Your Turn!"
      const notes = [440.0, 587.33, 880.0];
      notes.forEach((freq, idx) => {
        const start = t + idx * 0.065;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 2 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.01, start + 0.34);

        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.12, start + 0.018);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.36);

        osc.connect(g);
        g.connect(out);
        osc.start(start);
        osc.stop(start + 0.38);
      });
    } else {
      // Soft descending dusk chime -> unmistakably "Opponent's Turn"
      const notes = [392.0, 311.13];
      notes.forEach((freq, idx) => {
        const start = t + idx * 0.08;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, start + 0.3);

        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.1, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

        osc.connect(g);
        g.connect(out);
        osc.start(start);
        osc.stop(start + 0.34);
      });
    }
  }
}

export const sound = new SoundSystem();



