export default function StyleTestPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-slate-900">Urmila Raj Hospital Style Test</h1>
      <p className="mt-2 text-slate-600">
        This page uses only basic Tailwind classes to confirm the CSS compiler is working.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Card 1</p>
          <p className="mt-1 text-sm text-slate-500">Basic Tailwind card</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Card 2</p>
          <p className="mt-1 text-sm text-slate-500">Grid responsive</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Card 3</p>
          <p className="mt-1 text-sm text-slate-500">Tablet: 2 per row</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Card 4</p>
          <p className="mt-1 text-sm text-slate-500">Desktop: 4 per row</p>
        </div>
      </div>

      <button className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
        Test Button
      </button>

      <button className="mt-6 ml-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Secondary Button
      </button>
    </div>
  );
}
