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
      <section className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }} data-display="true">
              Denetim Kayıtları
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Son 100 işlem kaydını listeler.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Panele Dön
          </Link>
        </div>

        <article className="glass rounded-2xl p-6">
          {auditQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-28" />
                </div>
              ))}
            </div>
          ) : null}

          {auditQuery.isError ? (
            <div className="rounded-xl p-4 text-sm" style={{ background: "var(--error-soft)", color: "var(--error)" }}>
              Denetim kayıtları yüklenemedi.
              <button
                type="button"
                onClick={() => { void auditQuery.refetch(); }}
                className="btn-ghost ml-3 text-xs"
              >
                Tekrar Dene
              </button>
            </div>
          ) : null}

          {!auditQuery.isPending && !auditQuery.isError && auditQuery.data.data.length === 0 ? (
            <EmptyState
              iconLabel="📋"
              title="Henüz denetim kaydı yok"
              message="İşlemler gerçekleştikçe bu listede görünecek."
            />
          ) : null}

          {!auditQuery.isPending && !auditQuery.isError && auditQuery.data.data.length > 0 ? (
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">İşlem</th>
                    <th className="px-4 py-3">Varlık</th>
                    <th className="px-4 py-3">Varlık ID</th>
                    <th className="px-4 py-3">Admin ID</th>
                  </tr>
                </thead>
                <tbody>
                  {auditQuery.data.data.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{log.action}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{log.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>{log.entityId ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>{log.adminId ?? "-"}</td>
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