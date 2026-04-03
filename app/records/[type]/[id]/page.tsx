"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RecordType = "delegate" | "company" | "investor";

const TYPE_CONFIG: Record<RecordType, { label: string; color: string; badge: string }> = {
  delegate: { label: "مندوب", color: "#156661", badge: "bg-[#156661]/20 text-[#4ecca3]" },
  company: { label: "شركة", color: "#c0973b", badge: "bg-[#c0973b]/20 text-[#c0973b]" },
  investor: { label: "مستثمر", color: "#6366f1", badge: "bg-indigo-500/20 text-indigo-300" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-blue-500/20 text-blue-300" },
  contacted: { label: "تم التواصل", cls: "bg-yellow-500/20 text-yellow-300" },
  converted: { label: "تحوّل", cls: "bg-green-500/20 text-green-300" },
  rejected: { label: "مرفوض", cls: "bg-red-500/20 text-red-300" },
};

const ALL_STATUSES = ["new", "contacted", "converted", "rejected"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecordDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const type = params.type as RecordType;
  const id = params.id;

  const [record, setRecord] = useState<Record<string, string | number | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.delegate;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/record/${type}/${id}`, { cache: "no-store" });
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setRecord(data.row);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, id]);

  async function updateStatus(newStatus: string) {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/record/${type}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setRecord((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: `${cfg.color}40`, borderTopColor: cfg.color }} />
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-400 text-lg">السجل غير موجود</p>
        <button onClick={() => router.back()} className="text-sm px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          رجوع
        </button>
      </div>
    );
  }

  const name = String(record.name || "");
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  const status = String(record.status || "new");
  const statusInfo = STATUS_MAP[status] || { label: status, cls: "bg-white/10 text-gray-400" };

  // Build detail fields based on type
  const details: { label: string; value: string }[] = [];
  if (type === "delegate") {
    const NAT: Record<string,string> = { SA:"سعودي", EG:"مصري", PK:"باكستاني", IN:"هندي", BD:"بنغلاديشي", ID:"إندونيسي", MY:"ماليزي", YE:"يمني", SY:"سوري", OT:"أخرى" };
    const EXP: Record<string,string> = { "0-1":"أقل من سنة", "1-3":"١ - ٣ سنوات", "3-5":"٣ - ٥ سنوات", "5+":"أكثر من ٥ سنوات" };
    const LANG: Record<string,string> = { arabic:"العربية", english:"الإنجليزية", urdu:"الأردية", malay:"الملايو" };
    if (record.nationality) details.push({ label: "الجنسية", value: NAT[String(record.nationality)] || String(record.nationality) });
    if (record.experience) details.push({ label: "الخبرة", value: EXP[String(record.experience)] || String(record.experience) });
    if (record.languages) {
      try {
        const langs = JSON.parse(String(record.languages)) as string[];
        details.push({ label: "اللغات", value: langs.map((l) => LANG[l] || l).join(" · ") });
      } catch {
        details.push({ label: "اللغات", value: String(record.languages) });
      }
    }
  } else if (type === "company") {
    if (record.contact) details.push({ label: "المسؤول", value: String(record.contact) });
    if (record.license) details.push({ label: "رقم الرخصة", value: String(record.license) });
    if (record.size) details.push({ label: "حجم الشركة", value: String(record.size) });
  } else if (type === "investor") {
    if (record.investor_type) details.push({ label: "نوع المستثمر", value: String(record.investor_type) });
    if (record.country) details.push({ label: "الدولة", value: String(record.country) });
    if (record.interest_level) details.push({ label: "مستوى الاهتمام", value: String(record.interest_level) });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <span>→</span>
          <span>رجوع</span>
        </button>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
      </div>

      {/* Avatar + Name */}
      <div className="text-center mb-6">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: `${cfg.color}25`, color: cfg.color }}
        >
          {initials}
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{name}</h1>
        <div className="flex items-center justify-center gap-2 text-sm">
          {record.city && <span className="text-gray-400">{String(record.city)}</span>}
          {record.city && <span className="text-gray-600">•</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>{statusInfo.label}</span>
        </div>
      </div>

      {/* Status Selector */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4">
        <p className="text-gray-400 text-xs mb-3">تغيير الحالة</p>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => {
            const info = STATUS_MAP[s];
            const active = s === status;
            return (
              <button
                key={s}
                disabled={statusUpdating || active}
                onClick={() => updateStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  active ? info.cls + " ring-1 ring-white/30" : "bg-white/5 text-gray-500 hover:bg-white/10"
                }`}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact Card */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4 space-y-3">
        {record.phone && (
          <a href={`tel:${record.phone}`} className="flex items-center gap-3 text-white hover:text-[#4ecca3] transition-colors py-2">
            <span className="text-lg">📞</span>
            <span dir="ltr" className="text-sm">{String(record.phone)}</span>
          </a>
        )}
        {record.email && (
          <a href={`mailto:${record.email}`} className="flex items-center gap-3 text-white hover:text-[#c0973b] transition-colors py-2">
            <span className="text-lg">✉️</span>
            <span dir="ltr" className="text-sm">{String(record.email)}</span>
          </a>
        )}
        {type === "company" && record.website && (
          <a href={String(record.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-indigo-400 transition-colors py-2">
            <span className="text-lg">🌐</span>
            <span dir="ltr" className="text-sm truncate">{String(record.website)}</span>
          </a>
        )}
      </div>

      {/* Details Grid */}
      {details.length > 0 && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4">
          <div className="space-y-3">
            {details.map((d) => (
              <div key={d.label} className="flex justify-between items-start">
                <span className="text-gray-400 text-sm">{d.label}</span>
                <span className="text-white text-sm text-left max-w-[60%]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {record.notes && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4">
          <p className="text-gray-400 text-xs mb-2">ملاحظات</p>
          <p className="text-gray-300 text-sm leading-relaxed">{String(record.notes)}</p>
        </div>
      )}

      {/* Created At */}
      {record.created_at && (
        <div className="text-center text-gray-500 text-xs mt-6">
          تاريخ التسجيل: {formatDate(String(record.created_at))}
        </div>
      )}
    </div>
  );
}
