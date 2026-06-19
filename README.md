# Dictate Front

Dictate Front is a Next.js frontend for a medical dictation transcription workflow. It uploads an audio file through the Dictate backend upload flow, creates a backend transcription job from the returned asset id, polls the job until it completes or fails, displays patient segments with audio playback, and lets users save simple word corrections. The legacy public audio URL flow remains available as a secondary option.

## Tech Stack

- Next.js 14 with the Pages Router
- React 18
- TypeScript with strict mode enabled
- Tailwind CSS
- npm package management

## Requirements

- Node.js and npm
- A compatible backend API service

The backend must be reachable from the Next.js server. By default, the frontend proxies backend traffic to `http://localhost:3000`. Upload-service credentials stay on the backend and are not configured in this frontend.

## Setup

Install dependencies:

```powershell
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.local.example .env.local
```

Update `.env.local` if the backend is not running on the default URL:

```env
BACKEND_API_BASE_URL=http://localhost:3000
```

Start the development server:

```powershell
npm run dev
```

Open the app at:

```text
http://localhost:3001
```

## Scripts

- `npm run dev` starts Next.js in development mode on port `3001`.
- `npm run build` creates a production build.
- `npm run start` serves the production build on port `3001`.

## Project Structure

```text
.
|-- components/
|   |-- AudioPlayer.tsx        # Audio element and playback timestamp display
|   |-- PatientList.tsx        # Patient segment selector
|   |-- TranscriptViewer.tsx   # Interactive transcript editor
|   `-- TranscriptWord.tsx     # Clickable/editable transcript word
|-- lib/
|   |-- api.ts                 # Typed backend request helpers
|   `-- transcript.ts          # Transcript tokenization and timestamp helpers
|-- pages/
|   |-- _app.tsx               # Global app wrapper and stylesheet import
|   |-- index.tsx              # Job creation page
|   `-- transcriptions/
|       `-- [id].tsx           # Transcription review page
|-- styles/
|   `-- globals.css            # Tailwind imports and global styles
|-- types/
|   `-- api.ts                 # Shared request/response TypeScript types
|-- next.config.js             # Backend rewrite proxy configuration
|-- tailwind.config.ts         # Tailwind content, colors, fonts, animation
|-- postcss.config.js          # Tailwind and Autoprefixer setup
`-- tsconfig.json              # TypeScript compiler configuration
```

## Routes

### `/`

The home page renders the job creation form. Users select an audio file as the primary flow. A secondary public URL mode is available for legacy jobs.

Main calls:

- File mode calls `presignUpload()`, uploads the file to the returned presigned PUT URL, calls `completeUpload()`, then calls `createTranscription({ assetId })`.
- Public URL mode calls `createTranscription({ audioUrl })`.
- On success, the app navigates to `/transcriptions/{jobId}`.

### `/transcriptions/[id]`

The review page loads a transcription job by id, polls while the job is processing, and displays the editor once transcript data is available.

Main calls:

- `pages/transcriptions/[id].tsx` calls `getTranscription()` from `lib/api.ts`.
- While the status is `processing`, it polls every 2 seconds.
- When the status is `completed`, it calls `buildDisplayWords()` from `lib/transcript.ts`.
- Word edits call `createCorrection()` from `lib/api.ts`.

## Backend Proxy

Client code does not call the backend origin directly. All frontend API requests go through this relative proxy base:

```ts
const API_PROXY_BASE = "/api/backend";
```

`next.config.js` rewrites that path to the configured backend:

```text
/api/backend/:path* -> ${BACKEND_API_BASE_URL}/:path*
```

For example, a browser request to:

```text
/api/backend/transcriptions/abc123
```

is proxied by Next.js to:

```text
http://localhost:3000/transcriptions/abc123
```

The backend base URL is read from `BACKEND_API_BASE_URL`. If the variable is missing, it falls back to `http://localhost:3000`. A trailing slash is removed in `next.config.js`.

The browser does not call upload-service `POST /upload/presign`, `POST /upload/complete`, or `GET /internal/assets/:id/download-url`. It only calls the Dictate backend `/uploads/*` endpoints and uses the returned presigned PUT URL for direct file transfer. Do not add upload-service API keys or internal tokens to frontend environment variables.

## Backend Calls

All backend calls are defined in `lib/api.ts` and share the same `requestJson()` helper. The helper sends `Content-Type: application/json`, parses JSON responses when available, and throws an `Error` using either `{ "error": "..." }`, a plain text response body, or the HTTP status code.

### Presign Upload

Function:

```ts
presignUpload(body)
```

Request:

```http
POST /uploads/presign
Content-Type: application/json
```

Body:

```json
{
  "filename": "report.mp3",
  "mimeType": "audio/mpeg",
  "size": 12345678
}
```

Expected response:

```json
{
  "objectKey": "uploads/report.mp3",
  "uploadUrl": "https://temporary-upload-url",
  "expiresInSeconds": 900,
  "headers": {
    "Content-Type": "audio/mpeg"
  }
}
```

Used by `pages/index.tsx` before uploading the selected file with `XMLHttpRequest`.

### Complete Upload

Function:

```ts
completeUpload(body)
```

Request:

```http
POST /uploads/complete
Content-Type: application/json
```

Body:

```json
{
  "objectKey": "uploads/report.mp3",
  "filename": "report.mp3"
}
```

Expected response:

```json
{
  "assetId": "asset_123",
  "objectKey": "uploads/report.mp3",
  "status": "ready"
}
```

Used by `pages/index.tsx` after the presigned PUT upload succeeds.

### Create Transcription

Function:

```ts
createTranscription(body)
```

Request:

```http
POST /transcriptions
Content-Type: application/json
```

Uploaded asset body:

```json
{
  "assetId": "asset_123"
}
```

Legacy public URL body:

```json
{
  "audioUrl": "https://example.com/audio/report.mp3"
}
```

Expected response:

```json
{
  "jobId": "job_123",
  "status": "processing"
}
```

Used by `pages/index.tsx` after upload completion or when the secondary public URL mode is submitted.

### Get Transcription

Function:

```ts
getTranscription(id)
```

Request:

```http
GET /transcriptions/{id}
```

Expected response:

```json
{
  "jobId": "job_123",
  "status": "completed",
  "transcription": {
    "id": "transcription_123",
    "audioUrl": "https://example.com/audio/report.mp3",
    "fullText": "Transcript text returned by the backend.",
    "durationSeconds": 42.5,
    "errorMessage": null
  },
  "patients": [
    {
      "id": "patient_123",
      "patientName": "Jane Doe",
      "modality": "MRI",
      "startTime": 0,
      "endTime": 21.2
    }
  ]
}
```

The `status` value can be:

- `processing`
- `completed`
- `failed`

Used by `pages/transcriptions/[id].tsx`. The page polls this endpoint every 2 seconds while `status` is `processing`.

### Create Correction

Function:

```ts
createCorrection(body)
```

Request:

```http
POST /corrections
Content-Type: application/json
```

Body:

```json
{
  "wrong": "hte",
  "correct": "the"
}
```

Expected response:

```json
{
  "id": "correction_123",
  "wrong": "hte",
  "correct": "the",
  "count": 1,
  "createdAt": "2026-06-18T00:00:00.000Z"
}
```

Used by the transcript editor when a user changes a word. The UI updates the edited word immediately and queues the correction save with a 350 ms debounce.

## UI and Data Flow

1. The user selects an audio file on `/`.
2. `presignUpload()` sends `POST /uploads/presign` through `/api/backend`.
3. The browser uploads the file to the returned presigned PUT URL with the returned headers.
4. `completeUpload()` sends `POST /uploads/complete` through `/api/backend`.
5. `createTranscription({ assetId })` sends `POST /transcriptions`.
6. The backend returns a `jobId`.
7. The router opens `/transcriptions/{jobId}`.
8. `getTranscription()` sends `GET /transcriptions/{jobId}`.
9. If the job is still `processing`, the page polls again after 2 seconds.
10. If the job is `failed`, the page shows `transcription.errorMessage` when available.
11. If the job is `completed`, `buildDisplayWords()` converts `transcription.fullText` into display words.
12. `PatientList` selects patient segments. `TranscriptViewer` scrolls to the first word assigned to the selected patient.
13. Clicking a transcript word seeks the audio player to that word's estimated start time and opens inline editing.
14. Saving an edit updates local state and calls `POST /corrections`.

## Transcript Timing

The current backend response does not include stored word rows or per-word timestamps. `lib/transcript.ts` estimates word timestamps by splitting `transcription.fullText` on whitespace and distributing words across the transcript duration.

Duration resolution works in this order:

1. Use `transcription.durationSeconds` when it is a positive finite number.
2. Otherwise use the `endTime` of the last patient segment.
3. If neither value is available, word timestamps are marked unavailable.

Patient assignment is also estimated. Each word is assigned to the patient segment containing that word's estimated midpoint.

## Important Notes

- File upload is the primary flow. Audio files are uploaded through backend-issued presigned URLs, and upload-service secrets are never exposed to browser code.
- The secondary public URL flow still requires URLs that are publicly reachable by the backend. Private files, localhost URLs, and authenticated links can fail even if they work in the browser.
- There are no local Next.js API route handlers in this project. `/api/backend/*` is a rewrite proxy, not an application API endpoint.
- No automated test script is currently configured in `package.json`.
