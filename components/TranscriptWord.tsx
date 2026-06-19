import { forwardRef, useEffect, useRef } from "react";

import { formatTimestamp } from "../lib/transcript";
import type { DisplayWord } from "../types/api";

interface TranscriptWordProps {
  word: DisplayWord;
  isActive: boolean;
  isEditing: boolean;
  isSelectedPatient: boolean;
  draftValue: string;
  onActivate: (word: DisplayWord) => void;
  onCancel: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
}

export const TranscriptWord = forwardRef<HTMLSpanElement, TranscriptWordProps>(
  function TranscriptWord(
    {
      word,
      isActive,
      isEditing,
      isSelectedPatient,
      draftValue,
      onActivate,
      onCancel,
      onDraftChange,
      onSave,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const ignoreBlurRef = useRef(false);

    useEffect(() => {
      if (!isEditing) {
        return;
      }

      inputRef.current?.focus();
      inputRef.current?.select();
    }, [isEditing]);

    const title =
      word.start === null
        ? "Timestamp unavailable"
        : `${formatTimestamp(word.start)} - ${formatTimestamp(word.end)}${
            word.isEstimated ? " (estimated)" : ""
          }`;

    if (isEditing) {
      return (
        <span ref={ref} className="inline-flex">
          <input
            ref={inputRef}
            value={draftValue}
            className="w-28 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm outline-none ring-2 ring-amber-100"
            onBlur={() => {
              if (ignoreBlurRef.current) {
                ignoreBlurRef.current = false;
                return;
              }

              onSave();
            }}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                ignoreBlurRef.current = true;
                onSave();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                ignoreBlurRef.current = true;
                onCancel();
              }
            }}
          />
        </span>
      );
    }

    return (
      <span ref={ref} className="inline-flex">
        <button
          type="button"
          title={title}
          onClick={() => onActivate(word)}
          className={`rounded-md px-1.5 py-0.5 text-left text-[15px] leading-7 text-slate-800 transition hover:cursor-pointer hover:underline ${
            isActive
              ? "bg-yellow-200 ring-1 ring-amber-300"
              : isSelectedPatient
                ? "bg-blue-100"
                : "bg-transparent"
          }`}
        >
          {word.text}
        </button>
      </span>
    );
  },
);

TranscriptWord.displayName = "TranscriptWord";

