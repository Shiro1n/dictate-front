import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import { AudioPlayer } from "../../components/AudioPlayer";
import { PatientList } from "../../components/PatientList";
import { TranscriptViewer } from "../../components/TranscriptViewer";
import {
  createCorrection,
  getErrorMessage,
  getTranscription,
} from "../../lib/api";
import { buildDisplayWords } from "../../lib/transcript";
import type { DisplayWord, TranscriptionResponse } from "../../types/api";

export default function TranscriptionPage() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const correctionTimersRef = useRef<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResponse | null>(
    null,
  );
  const [words, setWords] = useState<DisplayWord[]>([]);

  const transcriptionId =
    typeof router.query.id === "string" ? router.query.id : null;

  useEffect(() => {
    return () => {
      Object.values(correctionTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    if (!transcriptionId) {
      return;
    }

    const currentTranscriptionId = transcriptionId;
    let isCancelled = false;
    let timeoutId: number | null = null;

    async function loadTranscription(isInitialLoad: boolean) {
      if (isInitialLoad) {
        setIsLoading(true);
      }

      try {
        const nextTranscription = await getTranscription(currentTranscriptionId);

        if (isCancelled) {
          return;
        }

        setTranscription(nextTranscription);
        setError(null);

        if (nextTranscription.status === "processing") {
          timeoutId = window.setTimeout(() => {
            void loadTranscription(false);
          }, 2000);
        }
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        setError(getErrorMessage(loadError));
      } finally {
        if (!isCancelled && isInitialLoad) {
          setIsLoading(false);
        }
      }
    }

    void loadTranscription(true);

    return () => {
      isCancelled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [transcriptionId]);

  useEffect(() => {
    if (transcription?.status !== "completed") {
      setWords([]);
      return;
    }

    setWords(
      buildDisplayWords(transcription.transcription, transcription.patients),
    );
    setSelectedPatientId((currentValue) => {
      if (
        currentValue &&
        transcription.patients.some((patient) => patient.id === currentValue)
      ) {
        return currentValue;
      }

      return transcription.patients[0]?.id ?? null;
    });
  }, [transcription]);

  function seekAudio(time: number | null) {
    if (time === null || !audioRef.current) {
      return;
    }

    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function queueCorrection(wordId: string, wrong: string, correct: string) {
    const normalizedWrong = wrong.trim();
    const normalizedCorrect = correct.trim();

    if (!normalizedWrong || !normalizedCorrect) {
      return;
    }

    if (normalizedWrong.toLowerCase() === normalizedCorrect.toLowerCase()) {
      return;
    }

    if (correctionTimersRef.current[wordId]) {
      window.clearTimeout(correctionTimersRef.current[wordId]);
    }

    correctionTimersRef.current[wordId] = window.setTimeout(async () => {
      try {
        await createCorrection({
          wrong: normalizedWrong,
          correct: normalizedCorrect,
        });
        setCorrectionError(null);
      } catch (saveError) {
        setCorrectionError(getErrorMessage(saveError));
      } finally {
        delete correctionTimersRef.current[wordId];
      }
    }, 350);
  }

  function saveCorrection(wordId: string, wrong: string, correct: string) {
    setWords((currentWords) =>
      currentWords.map((word) =>
        word.id === wordId ? { ...word, text: correct.trim() } : word,
      ),
    );
    queueCorrection(wordId, wrong, correct);
  }

  const status = transcription?.status;
  const isProcessing = status === "processing";
  const isFailed = status === "failed";
  const hasCompletedTranscript = status === "completed" && words.length > 0;

  return (
    <>
      <Head>
        <title>
          {transcriptionId
            ? `Transcription ${transcriptionId}`
            : "Transcription Editor"}
        </title>
      </Head>

      <main className="min-h-screen px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-fade-up mb-6 flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200/70 bg-white/80 px-6 py-5 shadow-panel backdrop-blur">
            <div>
              <Link
                href="/"
                className="text-sm font-medium text-teal-700 transition hover:text-teal-900"
              >
                Back to job creation
              </Link>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Transcription Review
              </h1>
              <p className="mt-2 font-mono text-sm text-slate-500">
                {transcriptionId ?? "Resolving id..."}
              </p>
            </div>
            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isFailed
                  ? "bg-rose-100 text-rose-700"
                  : isProcessing
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {status ?? "loading"}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-panel backdrop-blur">
              <p className="text-lg font-medium text-slate-900">
                Loading transcription...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-panel">
              <p className="text-lg font-semibold">Unable to load job</p>
              <p className="mt-3 text-sm leading-6">{error}</p>
            </div>
          ) : !transcription ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-panel backdrop-blur">
              <p className="text-lg font-medium text-slate-900">
                No transcription data found.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
              <PatientList
                patients={transcription.patients}
                selectedPatientId={selectedPatientId}
                onSelect={setSelectedPatientId}
              />

              <div className="space-y-6">
                <AudioPlayer
                  audioRef={audioRef}
                  currentTime={currentTime}
                  durationSeconds={transcription.transcription.durationSeconds}
                  src={transcription.transcription.audioUrl}
                  onTimeChange={setCurrentTime}
                />

                {isProcessing ? (
                  <section className="animate-fade-up rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-panel">
                    <p className="text-lg font-semibold">
                      Transcription is still processing.
                    </p>
                    <p className="mt-3 text-sm leading-6">
                      Polling <code>GET /transcriptions/{transcription.jobId}</code>{" "}
                      every 2 seconds until the job becomes{" "}
                      <code>completed</code> or <code>failed</code>.
                    </p>
                  </section>
                ) : null}

                {isFailed ? (
                  <section className="animate-fade-up rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-panel">
                    <p className="text-lg font-semibold">Transcription failed</p>
                    <p className="mt-3 text-sm leading-6">
                      {transcription.transcription.errorMessage ??
                        "The backend marked this job as failed."}
                    </p>
                  </section>
                ) : null}

                {correctionError ? (
                  <section className="animate-fade-up rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-panel">
                    Correction save failed: {correctionError}
                  </section>
                ) : null}

                {hasCompletedTranscript ? (
                  <TranscriptViewer
                    words={words}
                    currentTime={currentTime}
                    selectedPatientId={selectedPatientId}
                    onSeek={seekAudio}
                    onSaveCorrection={saveCorrection}
                  />
                ) : !isProcessing && !isFailed ? (
                  <section className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-panel backdrop-blur">
                    <p className="text-lg font-semibold text-slate-900">
                      Empty transcript
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      The job completed, but <code>transcription.fullText</code>{" "}
                      did not contain any words to render.
                    </p>
                  </section>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
