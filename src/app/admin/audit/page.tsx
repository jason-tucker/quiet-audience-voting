"use client";

import { useState } from "react";
import { AuditLog } from "@/components/admin/AuditLog";
import { AuthEventsLog } from "@/components/admin/AuthEventsLog";
import { Button } from "@/components/ui/Button";

type Tab = "votes" | "auth";

export default function AuditPage() {
  const [tab, setTab] = useState<Tab>("votes");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-white">Audit log</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "votes" ? "primary" : "secondary"}
            onClick={() => setTab("votes")}
          >
            Votes
          </Button>
          <Button
            size="sm"
            variant={tab === "auth" ? "primary" : "secondary"}
            onClick={() => setTab("auth")}
          >
            Admin logins
          </Button>
        </div>
      </div>

      {tab === "votes" ? <AuditLog /> : <AuthEventsLog />}
    </div>
  );
}
