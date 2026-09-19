import { tuning } from "../config/tuning";

export type MicrophoneStatus = "idle" | "requesting" | "calibrating" | "ready" | "error";

/** Ambient-relative gate; sustained noise is favored over short transients. */
export class BreathEnvelope {
  private samples: number[] = [];
  private elapsed = 0;
  private baseline = 0;
  private heldMs = 0;
  private strength = 0;
  calibrated = false;

  update(rms: number, noisiness: number, dt: number): number {
    if (!this.calibrated) {
      this.samples.push(rms);
      this.elapsed += dt;
      if (this.elapsed >= tuning.micCalibrationMs) {
        this.samples.sort((a, b) => a - b);
        this.baseline = this.samples[Math.floor(this.samples.length * 0.5)];
        this.samples = [];
        this.calibrated = true;
      }
      return 0;
    }
    const threshold = Math.max(tuning.micNoiseFloor, this.baseline * tuning.micNoiseMultiplier);
    const excess = Math.max(0, rms - threshold);
    if (excess === 0) {
      this.baseline += (rms - this.baseline) * (1 - Math.exp(-dt / 4000));
      this.heldMs = 0;
    } else {
      this.heldMs += dt;
    }
    const level = Math.min(1, excess / Math.max(tuning.micFullStrengthLevel, threshold * 2)) ** tuning.micResponseExponent;
    const target = this.heldMs >= tuning.micAttackMs ? level * (0.8 + 0.2 * noisiness) : 0;
    this.strength += (target - this.strength) * (1 - Math.exp(-dt / (target > this.strength ? 70 : 110)));
    return this.strength;
  }
}

export class BreathDetector {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private waveform = new Float32Array(2048);
  private spectrum = new Float32Array(1024);
  private envelope = new BreathEnvelope();
  private generation = 0;
  private status: MicrophoneStatus = "idle";

  constructor(private onStatus: (status: MicrophoneStatus, message?: string) => void) {}

  private report(status: MicrophoneStatus, message?: string) {
    this.status = status;
    this.onStatus(status, message);
  }

  async start() {
    this.stop();
    const generation = this.generation;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.report("error", "마이크를 사용하려면 HTTPS 주소로 접속해 주세요. 컴퓨터에서는 localhost도 사용할 수 있어요.");
      return;
    }
    this.report("requesting");
    try {
      // Resume during the button gesture, before waiting for permission (iOS).
      const context = new AudioContext();
      this.context = context;
      const resumed = context.resume();
      void resumed.catch(() => {});
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      await resumed;
      if (generation !== this.generation) return;
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.2;
      this.source = context.createMediaStreamSource(stream);
      this.source.connect(this.analyser); // No speaker output, recording, or upload.
      this.envelope = new BreathEnvelope();
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => this.fail("마이크 연결이 끊겼어요. 다시 시작해 주세요.");
      });
      context.onstatechange = () => {
        if (context.state !== "running" && this.status !== "requesting") {
          this.fail("마이크가 일시 중지됐어요. 다시 시작해 주세요.");
        }
      };
      this.report("calibrating");
    } catch (error) {
      if (generation !== this.generation) return;
      const name = error instanceof DOMException ? error.name : "";
      this.fail(name === "NotAllowedError"
        ? "마이크 권한이 필요해요. 브라우저 설정에서 마이크를 허용한 뒤 다시 눌러 주세요."
        : name === "NotFoundError"
          ? "마이크를 찾을 수 없어요. 마이크를 연결하고 다시 눌러 주세요."
          : "마이크를 켤 수 없어요. 다른 앱의 마이크 사용을 확인하고 다시 눌러 주세요.");
    }
  }

  sample(dt: number): number {
    if (!this.analyser || this.context?.state !== "running") return 0;
    this.analyser.getFloatTimeDomainData(this.waveform);
    this.analyser.getFloatFrequencyData(this.spectrum);
    let sum = 0;
    let mean = 0;
    for (const value of this.waveform) mean += value;
    mean /= this.waveform.length;
    for (const value of this.waveform) sum += (value - mean) ** 2;
    // Spectral flatness: noise has more distributed energy than a pure tone.
    let powerSum = 0;
    let logSum = 0;
    const end = Math.min(this.spectrum.length, Math.floor(8000 * this.analyser.fftSize / this.context.sampleRate));
    for (let i = 2; i < end; i++) {
      const power = Math.max(1e-12, 10 ** (this.spectrum[i] / 10));
      powerSum += power;
      logSum += Math.log(power);
    }
    const count = end - 2;
    const flatness = Math.exp(logSum / count) / (powerSum / count);
    const strength = this.envelope.update(Math.sqrt(sum / this.waveform.length), Math.min(1, flatness * 4), dt);
    if (this.envelope.calibrated && this.status === "calibrating") this.report("ready");
    return strength;
  }

  private fail(message: string) {
    this.stop();
    this.report("error", message);
  }

  stop() {
    this.generation++;
    this.source?.disconnect();
    this.source = null;
    this.analyser = null;
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.stream = null;
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {});
      this.context = null;
    }
    this.report("idle");
  }
}
