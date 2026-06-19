import { useEffect, useRef, useState } from "react";

import type { DisplayWord } from "../types/api";
import { TranscriptWord } from "./TranscriptWord";

interface TranscriptViewerProps {
  words: DisplayWord[];
  currentTime: number;
  selectedPatientId: string | null;
  onSeek: (time: number | null) => void;
  onSaveCorrection: (wordId: string, wrong: string, correct: string) => void;
}

export function TranscriptViewer({
  words,
  currentTime,
  selectedPatientId,
  onSeek,
  onSaveCorrection,
}: TranscriptViewerProps) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const wordRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }

    const firstWordForPatient = words.find(
      (word) => word.patientId === selectedPatientId,
    );

    if (!firstWordForPatient) {
      return;
    }

    wordRefs.current[firstWordForPatient.id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [selectedPatientId, words]);

  if (words.length === 0) {
    return (
      <section className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-panel backdrop-blur">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
          No transcript words are available yet.
        </div>
      </section>
    );
  }

  function activateWord(word: DisplayWord) {
    onSeek(word.start);
    setEditingWordId(word.id);
    setDraftValue(word.text);
  }

  function cancelEdit() {
    setEditingWordId(null);
    setDraftValue("");
  }

  function saveEdit() {
    if (!editingWordId) {
      return;
    }

    const word = words.find((entry) => entry.id === editingWordId);

    if (!word) {
      cancelEdit();
      return;
    }

    const nextValue = draftValue.trim();

    if (!nextValue) {
      cancelEdit();
      return;
    }

    if (nextValue !== word.text) {
      onSaveCorrection(word.id, word.text, nextValue);
    }

    cancelEdit();
  }

  return (
    <section className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
            Transcript
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Interactive Editor
          </h2>
        </div>
        <div className="max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Word timestamps are estimated from <code>fullText</code> and{" "}
          <code>durationSeconds</code> because the current public API does not
          return stored word rows.
        </div>
      </div>

      <div className="mt-6 max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex flex-wrap gap-x-1 gap-y-2 text-base leading-8">
          {words.map((word) => {
            const isActive =
              word.start !== null &&
              word.end !== null &&
              currentTime >= word.start &&
              currentTime <= word.end;

            return (
              <TranscriptWord
                key={word.id}
                ref={(element) => {
                  wordRefs.current[word.id] = element;
                }}
                word={word}
                isActive={isActive}
                isEditing={editingWordId === word.id}
                isSelectedPatient={selectedPatientId === word.patientId}
                draftValue={editingWordId === word.id ? draftValue : word.text}
                onActivate={activateWord}
                onCancel={cancelEdit}
                onDraftChange={setDraftValue}
                onSave={saveEdit}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
