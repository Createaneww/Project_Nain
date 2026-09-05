import { Link, useParams } from "react-router-dom";

function HealthWorkerUploadImagePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A194E]">
            Upload Retinal Image
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Screening #{id} - Retinal fundus image upload module.
          </p>
        </div>
        <Link
          to={`/health-worker/screenings/${id}`}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
        >
          ← Back to Screening
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-medium text-slate-700">Retinal Fundus Image Upload</p>
          <p className="text-xs text-slate-400 mt-1">
            Image upload pipeline for Screening #{id}.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HealthWorkerUploadImagePage;
