import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "\u0646\u062f\u064a\u0628 \u2014 \u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0627\u0644\u062a\u0633\u062c\u064a\u0644",
  description: "\u0644\u0648\u062d\u0629 \u0645\u062a\u0627\u0628\u0639\u0629 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0647\u062a\u0645\u0627\u0645",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#0f1923] antialiased">{children}</body>
    </html>
  );
}
