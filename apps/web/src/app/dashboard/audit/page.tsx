"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/feedback/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { listAuditLogs } from "@/lib/audit";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function AuditPage() {
  const auditQuery = useQuery({
    queryKey: ["audit", "latest"],
    queryFn: () => listAuditLogs(100),
    refetchInterval: 30_000,
  });

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Audit Log</h2>
            <p className="text-sm text-zinc-600">Son 100 islem kaydini listeler.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Dashboarda Don
          </Link>
        </div>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          {auditQuery.isPending ? (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Tarih</th>
                    <th className="px-3 py-2">Aksiyon</th>
                    <th className="px-3 py-2">Varlik</th>
                    <th className="px-3 py-2">Varlik ID</th>
                    <th className="px-3 py-2">Admin ID</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-t border-zinc-100">
                      <td className="px-3 py-2"><div className="h-4 w-32 animate-pulse rounded bg-zinc-200" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-24 animate-pulse rounded bg-zinc-200" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-20 animate-pulse rounded bg-zinc-200" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-28 animate-pulse rounded bg-zinc-200" /></td>
                      <td className="px-3 py-2"><div className="h-4 w-28 animate-pulse rounded bg-zinc-200" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {auditQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Audit kayitlari yuklenemedi.
              <button
                type="button"
                onClick={() => {
                  void auditQuery.refetch();
                }}
                className="ml-3 rounded-lg border border-rose-300 px-3 py-1 font-semibold"
              >
                Tekrar Dene
              </button>
            </div>
          ) : null}

          {!auditQuery.isPending && !auditQuery.isError && auditQuery.data.data.length === 0 ? (
            <EmptyState
              iconLabel="AL"
              title="Henuz audit kaydi yok"
              message="Islemler gerceklestikce bu listede gorunecek."
            />
          ) : null}

          {!auditQuery.isPending && !auditQuery.isError && auditQuery.data.data.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Tarih</th>
                    <th className="px-3 py-2">Aksiyon</th>
                    <th className="px-3 py-2">Varlik</th>
                    <th className="px-3 py-2">Varlik ID</th>
                    <th className="px-3 py-2">Admin ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditQuery.data.data.map((log) => (
                    <tr key={log.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-700">{formatDate(log.createdAt)}</td>
                      <td className="px-3 py-2 font-medium text-zinc-900">{log.action}</td>
                      <td className="px-3 py-2 text-zinc-700">{log.entityType}</td>
                      <td className="px-3 py-2 text-zinc-700">{log.entityId ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-700">{log.adminId ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </section>
    </AppShell>
  );
}