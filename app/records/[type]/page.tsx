"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type RecordType = "delegate" | "company" | "investor";

interface AnyRow {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
  status: string;
  created_at: string;
}

const TYPE_CONFIG: Record<RecordType, { label: string; pluralLabel: string; color: string; badge: string }> = {
  delegate: { label: "مندوب", pluralLabel: "المناديب", color: "#156661", badge: "bg-[#156661]/20 text-[#4ecca3]" },
  company: { label: "شركة", pluralLabel: "الشركات", color: "#c0973b", badge: "bg-[#c0973b]/20 text-[#c0973b]" },
  investor: { label: "مستثمر", pluralLabel: "المستثمرين", color: "#6366f1", badge: "bg-indigo-500/20 text-indigo-300" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-blue-500/20 text-blue-300" },
  contacted: { label: "تم التواصل", cls: "bg-yellow-500/20 text-yellow-300" },
  converted: { label: "تحوّل", cls: "bg-green-500/20 text-green-300" },
  rejected: { label: "مرفوض", cls: "bg-red-500/20 text-red-300" },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}

export default function RecordsListPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type as RecordType;
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.delegate;

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  // Filter options from stats
  const [cities, setCities] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch(`/api/records?type=${type}&stats=true`, { cache: "no-store" });
        const data = await res.json();
        setCities(data.cities || []);
      } catch {
        // ignore
      }
    }
    loadStats();
  }, [type]);

  const fetchRows = useCallback(
    async (searchVal: string, statusVal: string, cityVal: string, sortVal: string) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ type });
        if (searchVal) p.set("search", searchVal);
        if (statusVal && statusVal !== "all") p.set("status", statusVal);
        if (cityVal) p.set("city", cityVal);
        p.set("sort", sortVal);
        const res = await fetch(`/api/records?${p.toString()}`, { cache: "no-store" });
        const data = await res.json();
        setRows(data.rows || []);
        setTotal(data.total || 0);
      } catch {
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

  // Fetch on filter change (debounced for search)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRows(search, status, city, sort);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, status, city, sort, fetchRows]);

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setCity("");
    setSort("newest");
  }

  const hasFilters = search || status !== "all" || city;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← الرئيسية
          </button>
          <span className="text-gray-600">|</span>
          <h1 className="text-lg font-bold text-white">سجلات {cfg.pluralLabel}</h1>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
        >
          {total} سجل
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4 sticky top-0 z-10 backdrop-blur-sm bg-[#0f1923]/90">
        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none cursor-pointer flex-1 min-w-[100px]"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none cursor-pointer flex-1 min-w-[100px]"
          >
            <option value="">كل المدن</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none cursor-pointer flex-1 min-w-[100px]"
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
          >
            ✕ مسح الفلاتر
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${cfg.color}40`, borderTopColor: cfg.color }} />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500">لا توجد سجلات</div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((row) => {
              const statusInfo = STATUS_MAP[row.status] || { label: row.status, cls: "bg-white/10 text-gray-400" };
              const initials = String(row.name || "")
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("");
              const location = row.city || row.country || "";

              return (
                <button
                  key={row.id}
                  onClick={() => router.push(`/records/${type}/${row.id}`)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-right"
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white font-medium text-sm truncate">{row.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mr-2 ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {location && <span>{String(location)}</span>}
                      {location && <span>•</span>}
                      <span>{timeAgo(row.created_at)}</span>
                    </div>
                    {row.phone && (
                      <div className="text-xs text-gray-400 mt-0.5" dir="ltr">{row.phone}</div>
                    )}
                  </div>

                  {/* Arrow */}
                  <span className="text-gray-600 flex-shrink-0">←</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
