/** A wet water-drop pop with a brief pitch rise and a soft, rounded decay. */
export class PopSound {
  private context: AudioContext | null = null;

  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") void this.context.resume().catch(() => {});
    } catch {
      // Audio is optional; unsupported devices can still play with bubbles.
    }
  }

  play() {
    const context = this.context;
    if (!context || context.state !== "running") return;
    const duration = 0.14;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(430, now);
    oscillator.frequency.exponentialRampToValueAtTime(920, now + 0.018);
    oscillator.frequency.exponentialRampToValueAtTime(210, now + duration * 0.8);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };

    // A short breathy transient gives the pop some texture.
    const length = Math.floor(context.sampleRate * 0.055);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const airGain = context.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    airGain.gain.value = 0.025;
    noise.connect(filter);
    filter.connect(airGain);
    airGain.connect(context.destination);
    noise.start(now);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); airGain.disconnect(); };
  }

  dispose() {
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
