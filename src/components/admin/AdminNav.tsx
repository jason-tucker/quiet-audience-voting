"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/films", label: "Films" },
  { href: "/admin/devices", label: "Devices" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-full md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Quiet Audience Voting</h1>
        <p className="text-xs text-white/50">Admin</p>
      </div>
      <nav className="flex flex-row gap-2 md:flex-col md:gap-1 overflow-x-auto md:overflow-visible">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-white/70 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-zinc-800 pt-4">
        <Link href="/results" className="block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-zinc-800 hover:text-white">
          ↗ View results
        </Link>
        <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-zinc-800 hover:text-white">
          ↗ View voting screen
        </Link>
        <button
          onClick={onLogout}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
