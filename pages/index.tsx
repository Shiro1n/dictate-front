import type React from "react";

import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";

import {
  completeUpload,
  createTranscription,
  getErrorMessage,
  presignUpload,
} from "../lib/api";

type SubmissionMode = "file" | "url";
type UploadState =
  | "idle"
  | "requesting"
  | "uploading"
  | "completing"
  | "creating"
  | "error";

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
]);

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/m4a",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

function resolveAudioMimeType(file: File): string {
  if (AUDIO_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  return extension ? AUDIO_MIME_BY_EXTENSION[extension] ?? file.type : file.type;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getStateLabel(state: UploadState, progress: number): string {
  switch (state) {
    case "requesting":
      return "Requesting upload URL";
    case "uploading":
      return `Uploading${progress > 0 ? ` ${progress}%` : ""}`;
    case "completing":
      return "Completing upload";
    case "creating":
      return "Creating transcription job";
    case "error":
      return "Error";
    case "idle":
      return "Idle";
  }
}

function uploadFileToPresignedUrl(
  uploadUrl: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed before the file reached storage."));
    };

    xhr.send(file);
  });
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<SubmissionMode>("file");
  const [audioUrl, setAudioUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const isSubmitting =
    uploadState === "requesting" ||
    uploadState === "uploading" ||
    uploadState === "completing" ||
    uploadState === "creating";

  function resetStatus() {
    setError(null);
    setUploadProgress(0);
    setUploadState("idle");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    resetStatus();
  }

  async function handleFileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Select an audio file.");
      setUploadState("error");
      return;
    }

    const mimeType = resolveAudioMimeType(selectedFile);

    if (!AUDIO_MIME_TYPES.has(mimeType)) {
      setError("Unsupported audio file type.");
      setUploadState("error");
      return;
    }

    setError(null);
    setUploadProgress(0);

    try {
      setUploadState("requesting");
      const presignedUpload = await presignUpload({
        filename: selectedFile.name,
        mimeType,
        size: selectedFile.size,
      });

      setUploadState("uploading");
      await uploadFileToPresignedUrl(
        presignedUpload.uploadUrl,
        presignedUpload.headers,
        selectedFile,
        setUploadProgress,
      );

      setUploadState("completing");
      const completedUpload = await completeUpload({
        objectKey: presignedUpload.objectKey,
        filename: selectedFile.name,
      });

      setUploadState("creating");
      const response = await createTranscription({
        assetId: completedUpload.assetId,
      });

      await router.push(`/transcriptions/${response.jobId}`);
    } catch (submitError) {
      setUploadState("error");
      setError(getErrorMessage(submitError));
    }
  }

  async function handleUrlSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedAudioUrl = audioUrl.trim();

    if (!trimmedAudioUrl) {
      setError("Audio URL is required.");
      setUploadState("error");
      return;
    }

    setError(null);
    setUploadProgress(0);
    setUploadState("creating");

    try {
      const response = await createTranscription({
        audioUrl: trimmedAudioUrl,
      });

      await router.push(`/transcriptions/${response.jobId}`);
    } catch (submitError) {
      setUploadState("error");
      setError(getErrorMessage(submitError));
    }
  }

  return (
    <>
      <Head>
        <title>Dictate Front</title>
        <meta
          name="description"
          content="Medical dictation transcription frontend"
        />
      </Head>

      <main className="min-h-screen px-6 py-10">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr,1.05fr]">
          <div className="animate-fade-up flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
              Medical Transcription
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Upload dictation audio and open the review editor.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
              Audio files are uploaded through the backend upload handshake,
              then queued for the same transcription, segmentation, correction,
              and review workflow.
            </p>
          </div>

          <div className="animate-fade-up rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
            <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("file");
                  resetStatus();
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === "file"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                File Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("url");
                  resetStatus();
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === "url"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Public URL
              </button>
            </div>

            {mode === "file" ? (
              <form
                key="file-upload-form"
                className="mt-6 space-y-5"
                onSubmit={handleFileSubmit}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Audio file
                  </span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/webm,audio/mp4,audio/m4a,audio/aac,audio/ogg,.mp3,.wav,.webm,.m4a,.aac,.ogg"
                    disabled={isSubmitting}
                    onChange={handleFileChange}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                {selectedFile ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">Status</span>
                    <span className="text-slate-600">
                      {getStateLabel(uploadState, uploadProgress)}
                    </span>
                  </div>
                  {uploadState === "uploading" ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-700 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-400"
                >
                  {isSubmitting ? "Working..." : "Upload and Create Job"}
                </button>
              </form>
            ) : (
              <form
                key="public-url-form"
                className="mt-6 space-y-5"
                onSubmit={handleUrlSubmit}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Public audio URL
                  </span>
                  <input
                    type="url"
                    required
                    value={audioUrl}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setAudioUrl(event.target.value);
                      resetStatus();
                    }}
                    placeholder="https://example.com/audio/report.mp3"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">Status</span>
                    <span className="text-slate-600">
                      {getStateLabel(uploadState, uploadProgress)}
                    </span>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? "Creating job..." : "Create from URL"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
