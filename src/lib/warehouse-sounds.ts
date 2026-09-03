function beep(frequency: number, durationMs: number, type: OscillatorType, gainValue: number) {
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(context.destination);
  const now = context.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000 + 0.02);
  oscillator.onended = () => {
    void context.close();
  };
}

export function playWarehouseMatchSound() {
  beep(980, 90, "sine", 0.22);
  window.setTimeout(() => beep(1480, 140, "sine", 0.2), 90);
}

export function playWarehouseMismatchSound() {
  beep(160, 420, "sawtooth", 0.28);
}
