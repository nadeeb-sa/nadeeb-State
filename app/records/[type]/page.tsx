"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type RecordType = "delegate" | "company" | "investor";

interface AnyRow {
  id: number;
  name: string;
  phone?: string;
  city?: string;
  country?: string;
  status: string;
  created_at: string;
  experience?: string;
  languages?: string;
  size?: string;
  investor_type?: string;
}

interface FilterOptions {
  cities: string[];
  statuses: string[];
  // delegate
  experiences?: string[];
  languages?: string[];
  nationalities?: string[];
  // company
  sizes?: string[];
  // investor
  investorTypes?: string[];
  countries?: string[];
  interestLevels?: string[];
}

const TYPE_CONFIG: Record<RecordType, { label: string; pluralLabel: string; color: string }> = {
  delegate: { label: "مندوب",    pluralLabel: "المناديب",     color: "#156661" },
  company:  { label: "شركة",     pluralLabel: "الشركات",      color: "#c0973b" },
  investor: { label: "مستثمر",   pluralLabel: "المستثمرين",   color: "#6366f1" },
};

const STATUS_LABELS: Record<string, { ar: string; cls: string }> = {
  new:       { ar: "جديد",          cls: "bg-blue-500/20 text-blue-300" },
  contacted: { ar: "تم التواصل",    cls: "bg-yellow-500/20 text-yellow-300" },
  converted: { ar: "تحوّل",         cls: "bg-green-500/20 text-green-300" },
  rejected:  { ar: "مرفوض",         cls: "bg-red-500/20 text-red-300" },
};

const EXP_LABELS: Record<string, string> = {
  "0-1": "أقل من سنة",
  "1-3": "١ - ٣ سنوات",
  "3-5": "٣ - ٥ سنوات",
  "5+":  "أكثر من ٥ سنوات",
};

const LANG_LABELS: Record<string, string> = {
  arabic: "العربية", english: "الإنجليزية", urdu: "الأردية", malay: "الملايو",
};

const NAT_LABELS: Record<string, string> = {
  SA:"سعودي", AE:"إماراتي", KW:"كويتي", QA:"قطري", BH:"بحريني", OM:"عُماني",
  EG:"مصري", JO:"أردني", SY:"سوري", LB:"لبناني", IQ:"عراقي", PS:"فلسطيني",
  YE:"يمني", SD:"سوداني", LY:"ليبي", TN:"تونسي", DZ:"جزائري", MA:"مغربي",
  MR:"موريتاني", SO:"صومالي",
  PK:"باكستاني", IN:"هندي", BD:"بنغلاديشي", NP:"نيبالي", LK:"سريلانكي",
  ID:"إندونيسي", MY:"ماليزي", PH:"فلبيني",
  NG:"نيجيري", ET:"إثيوبي", KE:"كيني", TZ:"تنزاني", SN:"سنغالي", ML:"مالي",
  GB:"بريطاني", US:"أمريكي", FR:"فرنسي", TR:"تركي", IR:"إيراني", AF:"أفغاني",
  OT:"أخرى",
};

const SIZE_LABELS: Record<string, string> = {
  small: "صغيرة", medium: "متوسطة", large: "كبيرة",
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}

function FilterSelect({
  value, onChange, placeholder, options, labelFn,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; options: string[];
  labelFn?: (v: string) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none cursor-pointer flex-1 min-w-[110px]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{labelFn ? labelFn(o) : o}</option>
      ))}
    </select>
  );
}

export default function RecordsListPage() {
  const params  = useParams<{ type: string }>();
  const router  = useRouter();
  const type    = params.type as RecordType;
  const cfg     = TYPE_CONFIG[type] || TYPE_CONFIG.delegate;

  const [rows,    setRows]    = useState<AnyRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [opts,    setOpts]    = useState<FilterOptions>({ cities: [], statuses: [] });

  // ── filter state ───────────────────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("");
  const [city,       setCity]       = useState("");
  const [sort,       setSort]       = useState<"newest"|"oldest">("newest");
  // delegate
  const [experience, setExperience] = useState("");
  const [language,   setLanguage]   = useState("");
  const [nationality, setNationality] = useState("");
  // company
  const [size,       setSize]       = useState("");
  // investor
  const [country,    setCountry]    = useState("");
  const [invType,    setInvType]    = useState("");
  const [interest,   setInterest]   = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load filter options once
  useEffect(() => {
    fetch(`/api/records?type=${type}&stats=true`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOpts(d))
      .catch(() => {});
  }, [type]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ type, sort });
      if (search)     p.set("search",     search);
      if (status)     p.set("status",     status);
      if (city)       p.set("city",       city);
      if (experience) p.set("experience", experience);
      if (language)   p.set("language",   language);
      if (nationality) p.set("nationality", nationality);
      if (size)       p.set("size",       size);
      if (country)    p.set("country",    country);
      if (invType)    p.set("investorType", invType);
      if (interest)   p.set("interest",   interest);

      const res  = await fetch(`/api/records?${p}`, { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch {
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [type, sort, search, status, city, experience, language, size, country, invType, interest]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchRows, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchRows]);

  const clearFilters = () => {
    setSearch(""); setStatus(""); setCity(""); setSort("newest");
    setExperience(""); setLanguage(""); setNationality(""); setSize("");
    setCountry(""); setInvType(""); setInterest("");
  };

  const hasFilters = search || status || city || experience || language || nationality || size || country || invType || interest;

  // active filter count
  const filterCount = [search,status,city,experience,language,nationality,size,country,invType,interest].filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto px-3 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white transition-colors text-sm px-2 py-1 rounded-lg hover:bg-white/10">
            ← رجوع
          </button>
          <h1 className="text-base font-bold text-white">سجلات {cfg.pluralLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          {filterCount > 0 && (
            <span className="text-xs bg-[#c0973b]/20 text-[#c0973b] px-2 py-0.5 rounded-full">
              {filterCount} فلتر
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
            {total} سجل
          </span>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 mb-4 bg-[#0d1720]/95 backdrop-blur-sm pb-3 pt-1">
        {/* Search */}
        <div className="relative mb-2.5">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text" placeholder="بحث بالاسم، الهاتف، البريد..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-9 pl-4 py-2.5
                       text-sm text-white placeholder:text-gray-500 outline-none
                       focus:border-white/20 transition-colors"
          />
        </div>

        {/* Common filters row */}
        <div className="flex gap-2 flex-wrap mb-2">
          <FilterSelect
            value={status} onChange={setStatus}
            placeholder="كل الحالات"
            options={Object.keys(STATUS_LABELS)}
            labelFn={(v) => STATUS_LABELS[v]?.ar || v}
          />
          <FilterSelect
            value={city} onChange={setCity}
            placeholder="كل المدن"
            options={opts.cities}
          />
          <select
            value={sort} onChange={(e) => setSort(e.target.value as "newest"|"oldest")}
            className="bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none cursor-pointer flex-1 min-w-[110px]"
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
          </select>
        </div>

        {/* Type-specific filters */}
        {type === "delegate" && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <FilterSelect
                value={experience} onChange={setExperience}
                placeholder="كل الخبرات"
                options={opts.experiences || ["0-1","1-3","3-5","5+"]}
                labelFn={(v) => EXP_LABELS[v] || v}
              />
              <FilterSelect
                value={language} onChange={setLanguage}
                placeholder="كل اللغات"
                options={opts.languages || []}
                labelFn={(v) => LANG_LABELS[v] || v}
              />
            </div>
            {(opts.nationalities || []).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <FilterSelect
                  value={nationality} onChange={setNationality}
                  placeholder="كل الجنسيات"
                  options={opts.nationalities || []}
                  labelFn={(v) => NAT_LABELS[v] || v}
                />
              </div>
            )}
          </div>
        )}

        {type === "company" && (opts.sizes || []).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <FilterSelect
              value={size} onChange={setSize}
              placeholder="كل الأحجام"
              options={opts.sizes || []}
              labelFn={(v) => SIZE_LABELS[v] || v}
            />
          </div>
        )}

        {type === "investor" && (
          <div className="flex gap-2 flex-wrap">
            {(opts.countries || []).length > 0 && (
              <FilterSelect
                value={country} onChange={setCountry}
                placeholder="كل الدول"
                options={opts.countries || []}
              />
            )}
            {(opts.investorTypes || []).length > 0 && (
              <FilterSelect
                value={invType} onChange={setInvType}
                placeholder="نوع المستثمر"
                options={opts.investorTypes || []}
              />
            )}
            {(opts.interestLevels || []).length > 0 && (
              <FilterSelect
                value={interest} onChange={setInterest}
                placeholder="مستوى الاهتمام"
                options={opts.interestLevels || []}
              />
            )}
          </div>
        )}

        {/* Clear */}
        {hasFilters && (
          <button onClick={clearFilters}
            className="mt-2 text-xs text-gray-400 hover:text-[#c0973b] transition-colors flex items-center gap-1">
            ✕ مسح جميع الفلاتر
          </button>
        )}
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: `${cfg.color}40`, borderTopColor: cfg.color }} />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">لا توجد سجلات مطابقة</div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((row) => {
              const st = STATUS_LABELS[row.status] || { ar: row.status, cls: "bg-white/10 text-gray-400" };
              const initials = String(row.name || "").split(" ").slice(0,2).map((w) => w[0]).join("");
              const location = row.city || row.country || "";

              // Sub-info badges
              const subBadges: string[] = [];
              if (row.experience) subBadges.push(EXP_LABELS[row.experience] || row.experience);
              if (row.languages) {
                try {
                  const langs = JSON.parse(row.languages) as string[];
                  langs.forEach((l) => subBadges.push(LANG_LABELS[l] || l));
                } catch { /* ignore */ }
              }
              if (row.size) subBadges.push(SIZE_LABELS[row.size] || row.size);
              if (row.investor_type) subBadges.push(row.investor_type);

              return (
                <button key={row.id}
                  onClick={() => router.push(`/records/${type}/${row.id}`)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-colors text-right">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-white font-medium text-sm leading-tight truncate">{row.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${st.cls}`}>
                        {st.ar}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      {location && <span>{String(location)}</span>}
                      {location && <span>·</span>}
                      <span>{timeAgo(row.created_at)}</span>
                    </div>
                    {/* Sub-badges */}
                    {subBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subBadges.map((b, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-600 flex-shrink-0 text-lg">‹</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
