import { DeviceList } from "@/components/admin/DeviceList";
import { SuspiciousVotes } from "@/components/admin/SuspiciousVotes";

export default function DevicesPage() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Suspicious clusters</h2>
        <SuspiciousVotes />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">All devices</h2>
        <DeviceList />
      </section>
    </div>
  );
}
