import { AuditLog } from "@/components/admin/AuditLog";

export default function AuditPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-white">Audit log</h1>
      <AuditLog />
    </div>
  );
}
