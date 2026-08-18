import { useRef, useState } from 'react';

const MIME_CANDIDATES = [
  { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
  { mimeType: 'audio/webm', ext: 'webm' },
  { mimeType: 'audio/mp4', ext: 'mp4' },
  { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' }
];

function pickSupportedFormat() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mimeType)) || null;
}

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Records from the microphone and hands the finished Blob + a correctly-extensioned filename to
 * `onRecorded`. When `videoRef` is passed (the "Replace Video Audio" use case), recording plays
 * the video from the start automatically — so what you narrate lines up with what's on screen —
 * and the displayed clock tracks the VIDEO's own currentTime rather than wall-clock elapsed, so
 * "what should I say right now" is always answerable by just watching the number and the preview.
 * Stops itself automatically if the video reaches its end mid-recording.
 */
export default function AudioRecorder({ onRecorded, videoRef, label = 'Record Voiceover' }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const onVideoEndedRef = useRef(null);

  async function start() {
    setError(null);
    const format = pickSupportedFormat();
    if (!format) {
      setError('Audio recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: format.mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: format.mimeType });
        onRecorded(blob, `recording-${Date.now()}.${format.ext}`);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;

      const video = videoRef?.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
        const onEnded = () => stop();
        video.addEventListener('ended', onEnded);
        onVideoEndedRef.current = onEnded;
      }

      startRef.current = performance.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(video ? video.currentTime : (performance.now() - startRef.current) / 1000);
      }, 200);
      setRecording(true);
    } catch (err) {
      setError(err.message?.includes('Permission') || err.name === 'NotAllowedError'
        ? 'Microphone permission denied — allow mic access in your browser to record.'
        : err.message || 'Could not access microphone.');
    }
  }

  function stop() {
    recorderRef.current?.stop();
    clearInterval(timerRef.current);
    const video = videoRef?.current;
    if (video) {
      video.pause();
      if (onVideoEndedRef.current) video.removeEventListener('ended', onVideoEndedRef.current);
    }
    setRecording(false);
  }

  return (
    <div className="mt-2">
      {videoRef && (
        <p className="mb-1.5 text-xs text-slate-500">
          The video plays automatically while you record — watch it above and narrate along so
          your voice lines up with what's happening on screen.
        </p>
      )}
      {!recording ? (
        <button
          onClick={start}
          className="w-full rounded-md border border-news-border py-2 text-xs text-slate-300 hover:border-news-accent2 hover:text-white"
        >
          🎙️ {label}
        </button>
      ) : (
        <button
          onClick={stop}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-red-500 bg-red-500/10 py-2 text-xs text-red-300"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Stop Recording · {formatElapsed(elapsed)}{videoRef?.current ? ` / ${formatElapsed(videoRef.current.duration || 0)}` : ''}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
