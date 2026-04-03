"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  updatedAt: string;
  totals: { all: number; delegates: number; companies: number; investors: number };
  today: { delegates: number; companies: number; investors: number };
  week: { delegates: number; companies: number; investors: number };
  latest: { delegates: string; companies: string; investors: string };
  recent: Array<{ type: string; name: string; city: string; created_at: string; id?: number }>;
}

type RecordType = "delegate" | "company" | "investor";

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(frame);
      else setValue(target);
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function StatCard({
  label, value, sub1Label, sub1, sub2Label, sub2, color, onView
}: {
  label: string; value: number;
  sub1Label: string; sub1: number;
  sub2Label: string; sub2: number;
  color: string;
  onView: () => void;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 transition-all flex flex-col gap-4"
      style={{ borderColor: `${color}30` }}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="text-4xl font-bold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
        {animated.toLocaleString("ar-SA")}
      </div>
      <div className="flex gap-4 pt-3 border-t border-white/10">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">{sub1Label}</p>
          <p className="text-white font-semibold text-sm">+{sub1}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-0.5">{sub2Label}</p>
          <p className="text-white font-semibold text-sm">+{sub2}</p>
        </div>
      </div>
      <button
        onClick={onView}
        className="mt-1 w-full py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-90"
        style={{ borderColor: `${color}50`, color, backgroundColor: `${color}15` }}
      >
        عرض كامل السجلات ←
      </button>
    </div>
  );
}

const TYPE_CONFIG: Record<RecordType, { label: string; color: string; badge: string }> = {
  delegate: { label: "مندوب", color: "#156661", badge: "bg-[#156661]/20 text-[#4ecca3]" },
  company:  { label: "شركة",  color: "#c0973b", badge: "bg-[#c0973b]/20 text-[#c0973b]" },
  investor: { label: "مستثمر", color: "#6366f1", badge: "bg-indigo-500/20 text-indigo-300" },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}

// ─── Main Page ────────────────────────────────────────────
export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setError(null);
      setLastRefresh(new Date());
      setCountdown(30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const refreshInterval = setInterval(fetchStats, 30000);
    const countdownInterval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchStats]);

  return (
    <div className="min-h-screen bg-[#0f1923] text-white" dir="rtl">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />
            </div>
            <span className="text-green-400 text-sm font-semibold tracking-wide">LIVE</span>
            <span className="text-gray-600">|</span>
            <span className="text-white font-bold text-lg">نديب</span>
            <span className="text-gray-400 text-sm">— إحصائيات التسجيل</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {lastRefresh && (
              <span>
                آخر تحديث: {lastRefresh.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#156661] animate-pulse" />
              <span>تحديث خلال {countdown}ث</span>
            </div>
            <button
              onClick={fetchStats}
              className="text-[#c0973b] hover:text-white transition-colors border border-[#c0973b]/30 rounded-lg px-3 py-1 hover:bg-[#c0973b]/10"
            >
              ↻ تحديث
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && !stats && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#156661] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">جاري تحميل البيانات...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm text-center">
            خطأ في الاتصال: {error}
          </div>
        )}

        {stats && (
          <>
            {/* Total Banner */}
            <div className="bg-gradient-to-l from-[#156661]/20 to-transparent border border-[#156661]/30 rounded-2xl p-6 mb-8 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">إجمالي المسجلين</p>
                <p className="text-5xl font-bold text-white">{stats.totals.all.toLocaleString("ar-SA")}</p>
              </div>
              <div className="text-left">
                <p className="text-gray-400 text-sm mb-2">اليوم</p>
                <p className="text-2xl font-bold text-[#156661]">
                  +{(stats.today.delegates + stats.today.companies + stats.today.investors).toLocaleString("ar-SA")}
                </p>
              </div>
            </div>

            {/* 3 Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <StatCard
                label="المناديب"
                value={stats.totals.delegates}
                sub1Label="اليوم" sub1={stats.today.delegates}
                sub2Label="هذا الأسبوع" sub2={stats.week.delegates}
                color="#156661"
                onView={() => router.push("/records/delegate")}
              />
              <StatCard
                label="الشركات"
                value={stats.totals.companies}
                sub1Label="اليوم" sub1={stats.today.companies}
                sub2Label="هذا الأسبوع" sub2={stats.week.companies}
                color="#c0973b"
                onView={() => router.push("/records/company")}
              />
              <StatCard
                label="المستثمرين"
                value={stats.totals.investors}
                sub1Label="اليوم" sub1={stats.today.investors}
                sub2Label="هذا الأسبوع" sub2={stats.week.investors}
                color="#6366f1"
                onView={() => router.push("/records/investor")}
              />
            </div>

            {/* Recent Registrations */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold text-white">آخر التسجيلات</h2>
                <span className="text-gray-500 text-xs">{stats.recent.length} سجلات</span>
              </div>
              <div className="divide-y divide-white/5">
                {stats.recent.map((row, i) => {
                  const cfg = TYPE_CONFIG[row.type as RecordType] || TYPE_CONFIG.delegate;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (row.id) {
                          router.push(`/records/${row.type}/${row.id}`);
                        } else {
                          router.push(`/records/${row.type}`);
                        }
                      }}
                      className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-colors text-right"
                    >
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge} flex-shrink-0`}>
                        {cfg.label}
                      </span>
                      <span className="text-white font-medium flex-1 truncate">{row.name}</span>
                      <span className="text-gray-500 text-sm hidden sm:block">{row.city}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(row.created_at)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
