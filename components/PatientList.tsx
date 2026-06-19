import { formatTimestamp } from "../lib/transcript";
import type { TranscriptionPatient } from "../types/api";

interface PatientListProps {
  patients: TranscriptionPatient[];
  selectedPatientId: string | null;
  onSelect: (patientId: string) => void;
}

export function PatientList({
  patients,
  selectedPatientId,
  onSelect,
}: PatientListProps) {
  return (
    <aside className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
            Patients
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Segment List
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
          {patients.length}
        </span>
      </div>

      {patients.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Patient segments will appear after the transcription completes.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {patients.map((patient) => {
            const isSelected = patient.id === selectedPatientId;

            return (
              <button
                key={patient.id}
                type="button"
                onClick={() => onSelect(patient.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-blue-300 bg-blue-100 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-white"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {patient.patientName}
                </p>
                <p className="mt-1 text-sm text-slate-600">{patient.modality}</p>
                <p className="mt-2 font-mono text-xs text-slate-500">
                  {formatTimestamp(patient.startTime)} -{" "}
                  {formatTimestamp(patient.endTime)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

