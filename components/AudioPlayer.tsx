import type React from "react";

import { formatTimestamp } from "../lib/transcript";

interface AudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentTime: number;
  durationSeconds: number | null;
  src: string;
  onTimeChange: (time: number) => void;
}

export function AudioPlayer({
  audioRef,
  currentTime,
  durationSeconds,
  src,
  onTimeChange,
}: AudioPlayerProps) {
  return (
    <section className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
            Audio
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Dictation Playback
          </h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Playback
          </p>
          <p className="font-mono text-sm text-slate-700">
            {formatTimestamp(currentTime)} / {formatTimestamp(durationSeconds)}
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        controls
        src={src}
        className="mt-4 w-full"
        onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
      />
    </section>
  );
}

