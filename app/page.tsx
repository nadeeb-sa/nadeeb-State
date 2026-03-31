"use client";
import { useEffect, useState, useCallback } from "react";

interface Stats {
  updatedAt: string;
  totals: { all: number; delegates: number; companies: number; investors: number };
  today: { delegates: number; companies: number; investors: number };
  week: { delegates: number; companies: number; investors: number };
  latest: { delegates: string; companies: string; investors: string };
  recent: Array<{ type: string; name: string; city: string; created_at: string }>;
}

type RecordType = "delegate" | "company" | "investor";

interface DelegateRow {
  id: number; name: string; phone: string; email: string; city: string;
  experience: string; languages: string; notes: string; status: string; created_at: string;
}
interface CompanyRow {
  id: number; name: string; contact: string; phone: string; email: string;
  license: string; city: string; size: string; website: string; notes: string;
  status: string; created_at: string;
}
interface InvestorRow {
  id: number; name: string; phone: string; email: string; investor_type: string;
  country: string; interest_level: string; notes: string; status: string; created_at: string;
}
type AnyRow = DelegateRow | CompanyRow | InvestorRow;

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

const TYPE_LABELS: Record<RecordType, string> = {
  delegate: "المناديب",
  company: "الشركات",
  investor: "المستثمرين",
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ar-SA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Records Modal ────────────────────────────────────────
function RecordsModal({
  type, onClose
}: {
  type: RecordType;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const cfg = TYPE_CONFIG[type];

  const fetchRecords = useCallback(async (s: "newest" | "oldest") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/records?type=${type}&sort=${s}`, { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchRecords(sort); }, [fetchRecords, sort]);

  // filter by search
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return Object.values(r).some((v) =>
      typeof v === "string" && v.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#131e2b] rounded-2xl border border-white/10 w-full max-w-5xl mt-8 mb-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-lg">سجلات {TYPE_LABELS[type]}</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
              {filtered.length} سجل
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
              className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
            </select>
            {/* Search */}
            <input
              type="text"
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none placeholder:text-gray-500 w-36"
            />
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all text-lg">
              ✕
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: `${cfg.color}40`, borderTopColor: cfg.color }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">لا توجد سجلات</div>
          ) : type === "delegate" ? (
            <DelegateTable rows={filtered as DelegateRow[]} color={cfg.color} />
          ) : type === "company" ? (
            <CompanyTable rows={filtered as CompanyRow[]} color={cfg.color} />
          ) : (
            <InvestorTable rows={filtered as InvestorRow[]} color={cfg.color} />
          )}
        </div>
      </div>
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-white/10">
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 text-right text-xs font-semibold text-gray-400 whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-300",
    contacted: "bg-yellow-500/20 text-yellow-300",
    converted: "bg-green-500/20 text-green-300",
    rejected: "bg-red-500/20 text-red-300",
  };
  const labels: Record<string, string> = {
    new: "جديد", contacted: "تم التواصل", converted: "تحوّل", rejected: "مرفوض",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-white/10 text-gray-400"}`}>
      {labels[status] || status}
    </span>
  );
}

function DelegateTable({ rows, color }: { rows: DelegateRow[]; color: string }) {
  return (
    <table className="w-full text-sm">
      <TableHeader cols={["#", "الاسم", "الهاتف", "البريد", "المدينة", "الخبرة", "اللغات", "الحالة", "تاريخ التسجيل"]} />
      <tbody className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <tr key={r.id} className="hover:bg-white/3 transition-colors">
            <td className="px-4 py-3 text-gray-500 text-xs">{i + 1}</td>
            <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.name}</td>
            <td className="px-4 py-3 text-gray-300 whitespace-nowrap" dir="ltr">{r.phone}</td>
            <td className="px-4 py-3 text-gray-400 text-xs" dir="ltr">{r.email}</td>
            <td className="px-4 py-3 text-gray-300">{r.city}</td>
            <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{r.experience}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{r.languages}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CompanyTable({ rows, color }: { rows: CompanyRow[]; color: string }) {
  return (
    <table className="w-full text-sm">
      <TableHeader cols={["#", "الشركة", "المسؤول", "الهاتف", "البريد", "المدينة", "الحجم", "الموقع", "الحالة", "تاريخ التسجيل"]} />
      <tbody className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <tr key={r.id} className="hover:bg-white/3 transition-colors">
            <td className="px-4 py-3 text-gray-500 text-xs">{i + 1}</td>
            <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.name}</td>
            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.contact}</td>
            <td className="px-4 py-3 text-gray-300 whitespace-nowrap" dir="ltr">{r.phone}</td>
            <td className="px-4 py-3 text-gray-400 text-xs" dir="ltr">{r.email}</td>
            <td className="px-4 py-3 text-gray-300">{r.city}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{r.size}</td>
            <td className="px-4 py-3 text-gray-400 text-xs" dir="ltr">
              {r.website ? <a href={r.website} target="_blank" className="underline hover:text-white">{r.website}</a> : "—"}
            </td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InvestorTable({ rows, color }: { rows: InvestorRow[]; color: string }) {
  return (
    <table className="w-full text-sm">
      <TableHeader cols={["#", "الاسم", "الهاتف", "البريد", "نوع المستثمر", "الدولة", "مستوى الاهتمام", "الحالة", "تاريخ التسجيل"]} />
      <tbody className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <tr key={r.id} className="hover:bg-white/3 transition-colors">
            <td className="px-4 py-3 text-gray-500 text-xs">{i + 1}</td>
            <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.name}</td>
            <td className="px-4 py-3 text-gray-300 whitespace-nowrap" dir="ltr">{r.phone}</td>
            <td className="px-4 py-3 text-gray-400 text-xs" dir="ltr">{r.email}</td>
            <td className="px-4 py-3 text-gray-300 text-xs">{r.investor_type}</td>
            <td className="px-4 py-3 text-gray-300">{r.country}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{r.interest_level}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [modal, setModal] = useState<RecordType | null>(null);

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
      {/* Modal */}
      {modal && <RecordsModal type={modal} onClose={() => setModal(null)} />}

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
                onView={() => setModal("delegate")}
              />
              <StatCard
                label="الشركات"
                value={stats.totals.companies}
                sub1Label="اليوم" sub1={stats.today.companies}
                sub2Label="هذا الأسبوع" sub2={stats.week.companies}
                color="#c0973b"
                onView={() => setModal("company")}
              />
              <StatCard
                label="المستثمرين"
                value={stats.totals.investors}
                sub1Label="اليوم" sub1={stats.today.investors}
                sub2Label="هذا الأسبوع" sub2={stats.week.investors}
                color="#6366f1"
                onView={() => setModal("investor")}
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
                    <div key={i} className="px-6 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge} flex-shrink-0`}>
                        {cfg.label}
                      </span>
                      <span className="text-white font-medium flex-1 truncate">{row.name}</span>
                      <span className="text-gray-500 text-sm hidden sm:block">{row.city}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(row.created_at)}</span>
                    </div>
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
