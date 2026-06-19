export type TranscriptionJobStatus = "processing" | "completed" | "failed";

export type CreateTranscriptionRequest =
  | {
      audioUrl: string;
      assetId?: never;
    }
  | {
      assetId: string;
      audioUrl?: never;
    };

export interface CreateTranscriptionResponse {
  jobId: string;
  status: "processing";
}

export type PresignUploadRequest = {
  filename: string;
  mimeType: string;
  size: number;
};

export type PresignUploadResponse = {
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
};

export type CompleteUploadRequest = {
  objectKey: string;
  filename: string;
};

export type CompleteUploadResponse = {
  assetId: string;
  objectKey: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  url?: string;
};

export interface TranscriptionDetails {
  id: string;
  audioUrl: string;
  fullText: string;
  durationSeconds: number | null;
  errorMessage: string | null;
}

export interface TranscriptionPatient {
  id: string;
  patientName: string;
  modality: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptionResponse {
  jobId: string;
  status: TranscriptionJobStatus;
  transcription: TranscriptionDetails;
  patients: TranscriptionPatient[];
}

export interface CorrectionRequestBody {
  wrong: string;
  correct: string;
}

export interface CorrectionResponse {
  id: string;
  wrong: string;
  correct: string;
  count: number;
  createdAt: string;
}

export interface ErrorResponse {
  error: string;
}

export interface DisplayWord {
  id: string;
  index: number;
  text: string;
  start: number | null;
  end: number | null;
  patientId: string | null;
  isEstimated: boolean;
}
