export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1923] text-white" dir="rtl">
      {children}
    </div>
  );
}
