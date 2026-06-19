import type {
  DisplayWord,
  TranscriptionDetails,
  TranscriptionPatient,
} from "../types/api";

function tokenizeTranscript(text: string): string[] {
  return text.match(/\S+/g) ?? [];
}

function resolveTranscriptDuration(
  transcription: TranscriptionDetails,
  patients: readonly TranscriptionPatient[],
): number | null {
  if (
    typeof transcription.durationSeconds === "number" &&
    Number.isFinite(transcription.durationSeconds) &&
    transcription.durationSeconds > 0
  ) {
    return transcription.durationSeconds;
  }

  const lastPatient = patients[patients.length - 1];

  return lastPatient && Number.isFinite(lastPatient.endTime) && lastPatient.endTime > 0
    ? lastPatient.endTime
    : null;
}

export function buildDisplayWords(
  transcription: TranscriptionDetails,
  patients: readonly TranscriptionPatient[],
): DisplayWord[] {
  const tokens = tokenizeTranscript(transcription.fullText);

  if (tokens.length === 0) {
    return [];
  }

  const totalDuration = resolveTranscriptDuration(transcription, patients);
  const wordDuration =
    totalDuration !== null && totalDuration > 0
      ? totalDuration / tokens.length
      : null;
  let patientIndex = 0;

  return tokens.map((token, index) => {
    const start = wordDuration === null ? null : index * wordDuration;
    const end =
      wordDuration === null || totalDuration === null
        ? null
        : index === tokens.length - 1
          ? totalDuration
          : (index + 1) * wordDuration;
    const midpoint =
      start === null || end === null ? null : start + (end - start) / 2;

    while (
      midpoint !== null &&
      patientIndex < patients.length &&
      midpoint > patients[patientIndex].endTime
    ) {
      patientIndex += 1;
    }

    const patient =
      midpoint !== null &&
      patientIndex < patients.length &&
      midpoint >= patients[patientIndex].startTime &&
      midpoint <= patients[patientIndex].endTime
        ? patients[patientIndex]
        : null;

    return {
      id: `word-${index}`,
      index,
      text: token,
      start,
      end,
      patientId: patient?.id ?? null,
      isEstimated: true,
    };
  });
}

export function formatTimestamp(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "Timestamp unavailable";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;

  return `${String(minutes).padStart(2, "0")}:${remainder
    .toFixed(1)
    .padStart(4, "0")}`;
}
