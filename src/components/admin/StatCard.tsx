export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
      <p className="text-sm font-medium uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
