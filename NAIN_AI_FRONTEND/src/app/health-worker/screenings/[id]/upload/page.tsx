import { Link, useParams } from "react-router-dom";

function HealthWorkerUploadImagePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Upload Retinal Image
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Screening #{id} - Retinal fundus image upload module.
            </p>
          </div>
          <Link
            to="/health-worker/screenings"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          >
            ← Back to Screenings
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Retinal fundus image upload & ML analysis pipeline placeholder for Screening #{id}.
        </div>
      </div>
    </div>
  );
}

export default HealthWorkerUploadImagePage;
