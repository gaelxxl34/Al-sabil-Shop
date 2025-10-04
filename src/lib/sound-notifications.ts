// src/lib/sound-notifications.ts

export type SoundType = 'new-message' | 'order-update' | 'stock-alert';

class SoundNotificationManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, string> = new Map([
    ['new-message', '/sounds/new-message.mp3'],
    ['order-update', '/sounds/order-update.mp3'],
    ['stock-alert', '/sounds/stock-alert.mp3']
  ]);
  private enabled: boolean = true;
  private volume: number = 0.7; // 0-1
  private useFallbackSound: boolean = true; // Use synthesized sound if files missing

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPreferences();
    }
  }

  private async playFallbackSound(soundType: SoundType) {
    // Create a simple, pleasant notification beep using Web Audio API
    if (typeof window === 'undefined') return;
    
    try {
      if (!this.audioContext) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different sounds for different notification types
      const soundConfig = {
        'new-message': { freq: 800, duration: 0.1 },
        'order-update': { freq: 600, duration: 0.15 },
        'stock-alert': { freq: 400, duration: 0.2 }
      };

      const config = soundConfig[soundType] || soundConfig['new-message'];
      
      oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);
      oscillator.type = 'sine';
      
      // Fade in and out for smooth sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    } catch {
      // Even fallback sound failed, just ignore
    }
  }

  private loadPreferences() {
    try {
      const prefs = localStorage.getItem('notificationPreferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        this.enabled = parsed.enableSound !== false;
        this.volume = parsed.soundVolume || 0.7;
      }
    } catch {
      // Failed to load preferences, use defaults
    }
  }

  private savePreferences() {
    try {
      const prefs = {
        enableSound: this.enabled,
        soundVolume: this.volume
      };
      localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
    } catch {
      // Error saving notification preferences
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.savePreferences();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  async play(soundType: SoundType) {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }

    // Check if muted temporarily
    const muteUntil = localStorage.getItem('mutedUntil');
    if (muteUntil && Date.now() < parseInt(muteUntil)) {
      return; // Silently skip if muted
    }

    try {
      const soundPath = this.sounds.get(soundType);
      if (!soundPath) {
        return; // Silently skip if sound path not found
      }

      const audio = new Audio(soundPath);
      audio.volume = this.volume;
      
      // Try to play the audio file
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise.catch(() => {
          // If audio file fails to load, use fallback synthesized sound
          if (this.useFallbackSound) {
            this.playFallbackSound(soundType);
          }
        });
      }
    } catch {
      // If everything fails, try fallback sound
      if (this.useFallbackSound) {
        this.playFallbackSound(soundType);
      }
    }
  }

  muteFor(minutes: number) {
    const muteUntil = Date.now() + (minutes * 60 * 1000);
    localStorage.setItem('mutedUntil', muteUntil.toString());
  }

  unmute() {
    localStorage.removeItem('mutedUntil');
  }
}

// Singleton instance
let soundManager: SoundNotificationManager | null = null;

export function getSoundManager(): SoundNotificationManager {
  if (!soundManager && typeof window !== 'undefined') {
    soundManager = new SoundNotificationManager();
  }
  return soundManager!;
}

export async function playNotificationSound(soundType: SoundType) {
  const manager = getSoundManager();
  await manager.play(soundType);
}
