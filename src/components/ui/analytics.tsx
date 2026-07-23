import { useEffect } from "react";

const GA_ID = (import.meta as any).env?.VITE_GA_ID as string | undefined;

export function AnalyticsScript() {
  useEffect(() => {
    if (!GA_ID) return;
    const s = document.createElement("script");
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    s.async = true;
    document.head.appendChild(s);
    const inline = document.createElement("script");
    inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`;
    document.head.appendChild(inline);
  }, []);
  return null;
}
