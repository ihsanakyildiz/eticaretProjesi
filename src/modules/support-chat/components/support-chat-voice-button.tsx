"use client";

import { Mp3Encoder } from "@breezystack/lamejs";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_VOICE_SECONDS = 120;
const VOICE_SAMPLE_RATE = 16000;
const VOICE_BITRATE_KBPS = 32;

function pickRecorderMime() {
  const types = [
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/mpeg",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function isWhatsAppAudioMime(mime: string) {
  const base = mime.split(";")[0].trim().toLowerCase();
  return (
    base === "audio/mpeg" ||
    base === "audio/mp4" ||
    base === "audio/aac" ||
    base === "audio/amr" ||
    base === "audio/ogg" ||
    base === "audio/opus"
  );
}

function fileNameForMime(mime: string) {
  const base = mime.split(";")[0].trim().toLowerCase();
  switch (base) {
    case "audio/mpeg":
      return "ses-mesaji.mp3";
    case "audio/mp4":
    case "audio/aac":
      return "ses-mesaji.m4a";
    case "audio/ogg":
    case "audio/opus":
      return "ses-mesaji.ogg";
    case "audio/amr":
      return "ses-mesaji.amr";
    default:
      return "ses-mesaji.webm";
  }
}

function floatToInt16(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return out;
}

async function transcodeToMp3(blob: Blob): Promise<File | null> {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const context = new Ctx();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const frameCount = Math.max(1, Math.ceil(decoded.duration * VOICE_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, frameCount, VOICE_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);
    const encoder = new Mp3Encoder(1, VOICE_SAMPLE_RATE, VOICE_BITRATE_KBPS);
    const pcm = floatToInt16(samples);
    const parts: Uint8Array[] = [];
    const block = 1152;
    for (let i = 0; i < pcm.length; i += block) {
      const encoded = encoder.encodeBuffer(pcm.subarray(i, i + block));
      if (encoded.length > 0) parts.push(encoded);
    }
    const tail = encoder.flush();
    if (tail.length > 0) parts.push(tail);
    if (parts.length === 0) return null;
    const mp3Blob = new Blob(
      parts.map((part) => new Uint8Array(part)),
      { type: "audio/mpeg" },
    );
    return new File([mp3Blob], "ses-mesaji.mp3", { type: "audio/mpeg" });
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function finalizeVoiceBlob(blob: Blob): Promise<File> {
  const mime = blob.type.split(";")[0].trim() || "audio/webm";
  if (isWhatsAppAudioMime(mime)) {
    return new File([blob], fileNameForMime(mime), { type: mime });
  }
  const mp3 = await transcodeToMp3(blob);
  if (mp3) return mp3;
  return new File([blob], fileNameForMime(mime), { type: mime });
}

function formatElapsed(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SupportChatVoiceButton({
  disabled,
  onRecorded,
  onError,
  variant = "default",
}: {
  disabled: boolean;
  onRecorded: (file: File) => void;
  onError: (message: string) => void;
  variant?: "default" | "toolbar";
}) {
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  useEffect(() => {
    if (!recording) return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_VOICE_SECONDS) void stopRecording();
    }, 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      stopTracks();
    };
  }, []);

  async function startRecording() {
    if (disabled || recording || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError("Bu tarayıcı ses kaydını desteklemiyor.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickRecorderMime();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stopTracks();
        setRecording(false);
        onError("Ses kaydı alınamadı.");
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stopTracks();
        chunksRef.current = [];
        if (blob.size < 1) {
          onError("Kayıt boş.");
          return;
        }
        setPreparing(true);
        void finalizeVoiceBlob(blob)
          .then(onRecorded)
          .catch(() => onError("Ses kaydı işlenemedi."))
          .finally(() => setPreparing(false));
      };
      recorder.start(250);
      setRecording(true);
    } catch {
      stopTracks();
      onError("Mikrofon izni gerekli.");
    }
  }

  const label = recording ? "Kaydı durdur" : preparing ? "Ses hazırlanıyor" : "Sesli mesaj kaydet";
  const toolbar = variant === "toolbar";

  return (
    <button
      type="button"
      disabled={disabled || preparing}
      onClick={() => {
        if (recording) void stopRecording();
        else void startRecording();
      }}
      title={label}
      className={
        toolbar
          ? `grid h-8 min-w-8 place-items-center rounded-lg px-1.5 ${
              recording
                ? "bg-rose-50 text-rose-600"
                : "text-[#6b858c] hover:bg-[#eef3f6] hover:text-[#3d6b75]"
            } disabled:opacity-40`
          : `grid h-10 min-w-10 place-items-center rounded-full border px-2 ${
              recording
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-[#e9ebec] text-slate-500 hover:text-[#405189]"
            } disabled:opacity-50`
      }
    >
      {recording ? (
        <span className="flex items-center gap-1 text-[11px] font-semibold">
          <Square className="h-3 w-3 fill-current" />
          {formatElapsed(elapsed)}
        </span>
      ) : preparing ? (
        <span className="px-1 text-[11px] font-semibold">…</span>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
