import type {
  CompleteUploadRequest,
  CompleteUploadResponse,
  CorrectionRequestBody,
  CorrectionResponse,
  CreateTranscriptionRequest,
  CreateTranscriptionResponse,
  ErrorResponse,
  PresignUploadRequest,
  PresignUploadResponse,
  TranscriptionResponse,
} from "../types/api";

const API_PROXY_BASE = "/api/backend";

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as ErrorResponse).error === "string"
  );
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PROXY_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (isErrorResponse(payload)) {
      throw new Error(payload.error);
    }

    if (typeof payload === "string" && payload.trim()) {
      throw new Error(payload);
    }

    throw new Error(`Request failed with status ${response.status}.`);
  }

  return payload as T;
}

export function createTranscription(
  body: CreateTranscriptionRequest,
): Promise<CreateTranscriptionResponse> {
  return requestJson<CreateTranscriptionResponse>("/transcriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function presignUpload(
  body: PresignUploadRequest,
): Promise<PresignUploadResponse> {
  return requestJson<PresignUploadResponse>("/uploads/presign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function completeUpload(
  body: CompleteUploadRequest,
): Promise<CompleteUploadResponse> {
  return requestJson<CompleteUploadResponse>("/uploads/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTranscription(id: string): Promise<TranscriptionResponse> {
  return requestJson<TranscriptionResponse>(
    `/transcriptions/${encodeURIComponent(id)}`,
  );
}

export function createCorrection(
  body: CorrectionRequestBody,
): Promise<CorrectionResponse> {
  return requestJson<CorrectionResponse>("/corrections", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
