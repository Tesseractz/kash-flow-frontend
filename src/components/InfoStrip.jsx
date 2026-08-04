import { useEffect, useState } from "react";
import { getWeather, getRates, weatherEmoji } from "../lib/infoFeeds";

// Live clock + weather + ZAR forex strip for the app headers.
// variant="desktop": full strip (clock w/ seconds, date, weather, USD/EUR).
// variant="mobile": ultra-compact (HH:MM + temperature only).
export default function InfoStrip({ variant = "desktop" }) {
  const isMobile = variant === "mobile";
  const [now, setNow] = useState(() => new Date());
  const [wx, setWx] = useState(null);
  const [fx, setFx] = useState(null);

  // Clock — per-second on desktop, per-half-minute on mobile (battery).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), isMobile ? 30000 : 1000);
    return () => clearInterval(id);
  }, [isMobile]);

  // Feeds — fetch on mount, then refresh periodically. Failures fall back to
  // cached values inside the feed helpers, so we never throw here.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [w, r] = await Promise.all([getWeather(), getRates()]);
      if (!alive) return;
      if (w) setWx(w);
      if (r) setFx(r);
    };
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(isMobile ? {} : { second: "2-digit" }),
    hour12: false,
  });
  const date = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (isMobile) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap overflow-hidden"
        title={wx ? `${wx.label} · ${wx.temp}°C` : date}
      >
        <span>{time}</span>
        {wx && (
          <span className="truncate">
            {weatherEmoji(wx.code)} {wx.temp}°
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0 text-sm text-slate-600 dark:text-slate-300 select-none">
      {/* Clock + date */}
      <div className="flex items-baseline gap-2 whitespace-nowrap" title={date}>
        <span className="font-display font-semibold text-base text-slate-900 dark:text-white tabular-nums tracking-tight">
          {time}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{date}</span>
      </div>

      {/* Weather */}
      {wx && (
        <>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
          <div
            className="flex items-center gap-1.5 whitespace-nowrap"
            title={`Current weather · ${wx.label}`}
          >
            <span className="text-base leading-none">{weatherEmoji(wx.code)}</span>
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {wx.temp}°C
            </span>
            <span className="hidden xl:inline text-xs text-slate-500 dark:text-slate-400">
              {wx.label}
            </span>
          </div>
        </>
      )}

      {/* Forex */}
      {fx && (fx.USD || fx.EUR) && (
        <>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
          <div
            className="hidden md:flex items-center gap-2 whitespace-nowrap text-xs tabular-nums"
            title="Exchange rates (ECB reference) — rands per 1 unit"
          >
            {fx.USD && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 ring-1 ring-inset ring-slate-200/70 dark:ring-slate-700/60 text-slate-600 dark:text-slate-300">
                $1 · <span className="font-semibold text-slate-800 dark:text-slate-100">R{fx.USD.toFixed(2)}</span>
              </span>
            )}
            {fx.EUR && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 ring-1 ring-inset ring-slate-200/70 dark:ring-slate-700/60 text-slate-600 dark:text-slate-300">
                €1 · <span className="font-semibold text-slate-800 dark:text-slate-100">R{fx.EUR.toFixed(2)}</span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
