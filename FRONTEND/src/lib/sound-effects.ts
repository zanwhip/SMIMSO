/**
 * Sound Effects Service - Enhanced with smooth transitions and better melodies
 * Generates and plays high-quality sound effects for call actions
 */

class SoundEffectsService {
  private audioContext: AudioContext | null = null;
  private isEnabled = true;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Create reverb effect
  private createReverb(ctx: AudioContext, wetGain: number = 0.3): ConvolverNode {
    const convolver = ctx.createConvolver();
    const impulseLength = ctx.sampleRate * 0.3;
    const impulse = ctx.createBuffer(2, impulseLength, ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < impulseLength; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 1.5);
      }
    }
    
    convolver.buffer = impulse;
    return convolver;
  }

  // Enhanced tone with smooth fade and effects
  private async playTone(
    frequency: number,
    duration: number,
    type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
    volume: number = 0.3,
    options: {
      fadeIn?: number;
      fadeOut?: number;
      vibrato?: { speed: number; depth: number };
      harmonics?: number[];
    } = {}
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const masterGain = ctx.createGain();

      // Add vibrato if specified
      if (options.vibrato) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = options.vibrato.speed;
        lfoGain.gain.value = options.vibrato.depth;
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        lfo.start();
        lfo.stop(ctx.currentTime + duration);
      }

      // Add harmonics if specified
      const oscillators: OscillatorNode[] = [oscillator];
      if (options.harmonics && options.harmonics.length > 0) {
        options.harmonics.forEach((harmonic, index) => {
          const harmonicOsc = ctx.createOscillator();
          const harmonicGain = ctx.createGain();
          harmonicOsc.type = type;
          harmonicOsc.frequency.value = frequency * harmonic;
          harmonicGain.gain.value = volume * 0.3 / (index + 2); // Lower volume for harmonics
          harmonicOsc.connect(harmonicGain);
          harmonicGain.connect(gainNode);
          harmonicOsc.start();
          harmonicOsc.stop(ctx.currentTime + duration);
          oscillators.push(harmonicOsc);
        });
      }

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      oscillator.connect(gainNode);
      
      // Add reverb for smoother sound
      const reverb = this.createReverb(ctx, 0.2);
      const reverbGain = ctx.createGain();
      const dryGain = ctx.createGain();
      
      gainNode.connect(dryGain);
      gainNode.connect(reverb);
      reverb.connect(reverbGain);
      
      dryGain.gain.value = 0.7;
      reverbGain.gain.value = 0.3;
      
      dryGain.connect(masterGain);
      reverbGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      const fadeIn = options.fadeIn || 0.05;
      const fadeOut = options.fadeOut || 0.1;
      const now = ctx.currentTime;

      // Smooth fade in
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(volume, now + fadeIn);
      
      // Hold
      masterGain.gain.setValueAtTime(volume, now + fadeIn);
      
      // Smooth fade out
      masterGain.gain.linearRampToValueAtTime(volume * 0.5, now + duration - fadeOut);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
    }
  }

  // Play chord with smooth transitions
  private async playChord(
    frequencies: number[],
    duration: number,
    volume: number = 0.25
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      const fadeIn = 0.08;
      const fadeOut = 0.15;
      const now = ctx.currentTime;

      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(volume, now + fadeIn);
      masterGain.gain.setValueAtTime(volume, now + duration - fadeOut);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        gainNode.gain.value = 1 / frequencies.length; // Balance volume
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        // Stagger start slightly for smoother sound
        oscillator.start(now + index * 0.01);
        oscillator.stop(now + duration);
      });
    } catch (error) {
    }
  }

  // Play melody with smooth transitions
  private async playMelody(
    notes: Array<{ freq: number; duration: number; volume?: number }>,
    transitionTime: number = 0.05
  ): Promise<void> {
    if (!this.isEnabled) return;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const nextNote = notes[i + 1];
      
      await this.playTone(
        note.freq,
        note.duration,
        'sine',
        note.volume || 0.3,
        {
          fadeIn: 0.03,
          fadeOut: nextNote ? transitionTime : 0.1,
        }
      );
      
      if (nextNote) {
        await new Promise(resolve => setTimeout(resolve, transitionTime * 1000));
      }
    }
  }

  // Incoming call - smooth ringing with melody
  async playIncomingCall(): Promise<void> {
    if (!this.isEnabled) return;
    
    const playRing = async () => {
      // Smooth ascending melody for incoming call
      await this.playMelody([
        { freq: 523.25, duration: 0.15, volume: 0.35 }, // C
        { freq: 659.25, duration: 0.15, volume: 0.35 }, // E
        { freq: 783.99, duration: 0.2, volume: 0.4 }, // G
      ], 0.03);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Repeat pattern
      await this.playMelody([
        { freq: 523.25, duration: 0.15, volume: 0.35 },
        { freq: 659.25, duration: 0.15, volume: 0.35 },
        { freq: 783.99, duration: 0.2, volume: 0.4 },
      ], 0.03);
    };

    playRing();
    
    const interval = setInterval(() => {
      if (!this.isEnabled) {
        clearInterval(interval);
        return;
      }
      playRing();
    }, 3000);

    (this as any).incomingCallInterval = interval;
  }

  stopIncomingCall(): void {
    if ((this as any).incomingCallInterval) {
      clearInterval((this as any).incomingCallInterval);
      (this as any).incomingCallInterval = null;
    }
  }

  // Accept call - pleasant ascending chord progression
  async playAcceptCall(): Promise<void> {
    if (!this.isEnabled) return;
    
    // Play smooth ascending chord progression
    await this.playChord([523.25, 659.25], 0.12, 0.3); // C-E
    await new Promise(resolve => setTimeout(resolve, 30));
    await this.playChord([659.25, 783.99], 0.12, 0.3); // E-G
    await new Promise(resolve => setTimeout(resolve, 30));
    await this.playChord([783.99, 987.77], 0.2, 0.35); // G-B
  }

  // Decline call - gentle descending melody
  async playDeclineCall(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.playMelody([
      { freq: 783.99, duration: 0.12, volume: 0.25 }, // G
      { freq: 659.25, duration: 0.12, volume: 0.25 }, // E
      { freq: 523.25, duration: 0.18, volume: 0.2 }, // C
    ], 0.04);
  }

  // End call - smooth descending tone
  async playEndCall(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.playTone(440, 0.25, 'sine', 0.28, {
      fadeIn: 0.05,
      fadeOut: 0.15,
      vibrato: { speed: 3, depth: 5 },
    });
  }

  // Toggle mic - subtle click with tone
  async playToggleMic(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.playTone(600, 0.08, 'sine', 0.2, {
      fadeIn: 0.02,
      fadeOut: 0.05,
    });
  }

  // Toggle video - subtle click with tone
  async playToggleVideo(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.playTone(700, 0.08, 'sine', 0.2, {
      fadeIn: 0.02,
      fadeOut: 0.05,
    });
  }

  // Switch camera - smooth double tone
  async playSwitchCamera(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.playTone(500, 0.06, 'sine', 0.22, {
      fadeIn: 0.02,
      fadeOut: 0.04,
    });
    await new Promise(resolve => setTimeout(resolve, 30));
    await this.playTone(600, 0.06, 'sine', 0.22, {
      fadeIn: 0.02,
      fadeOut: 0.04,
    });
  }

  // Connection established - beautiful chord progression
  async playConnected(): Promise<void> {
    if (!this.isEnabled) return;
    
    // Smooth chord progression: Am -> C -> F
    await this.playChord([440, 523.25, 659.25], 0.1, 0.25); // Am
    await new Promise(resolve => setTimeout(resolve, 20));
    await this.playChord([523.25, 659.25, 783.99], 0.1, 0.25); // C
    await new Promise(resolve => setTimeout(resolve, 20));
    await this.playChord([349.23, 440, 523.25], 0.15, 0.3); // F
  }

  // Error sound - gentle warning
  async playError(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.playTone(200, 0.25, 'triangle', 0.25, {
      fadeIn: 0.05,
      fadeOut: 0.15,
      vibrato: { speed: 4, depth: 10 },
    });
  }

  // Enable/disable sound effects
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopIncomingCall();
    }
  }

  isSoundEnabled(): boolean {
    return this.isEnabled;
  }
}

export const soundEffects = new SoundEffectsService();
