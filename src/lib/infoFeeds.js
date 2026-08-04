// Live info feeds for the header InfoStrip: weather (Open-Meteo) and
// ZAR exchange rates (Frankfurter/ECB). Both APIs are free, key-less and
// CORS-open. Results are cached in localStorage so the strip still renders
// offline and we never hammer the APIs.

const WX_KEY = "kashpoint_wx_v1";
const FX_KEY = "kashpoint_fx_v1";
const WX_TTL = 30 * 60 * 1000; // 30 min
const FX_TTL = 60 * 60 * 1000; // 60 min

// Johannesburg — sensible default for a ZAR-based POS. If the user has already
// granted geolocation (e.g. via another feature) we use their position without
// ever triggering a permission prompt.
const DEFAULT_COORDS = { lat: -26.2041, lon: 28.0473, label: "Johannesburg" };

function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage full/blocked — fine */
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function silentCoords() {
  try {
    if (!navigator.permissions || !navigator.geolocation) return DEFAULT_COORDS;
    const perm = await navigator.permissions.query({ name: "geolocation" });
    if (perm.state !== "granted") return DEFAULT_COORDS;
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 3000,
        maximumAge: 10 * 60 * 1000,
      })
    );
    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      label: "My location",
    };
  } catch {
    return DEFAULT_COORDS;
  }
}

/** @returns {Promise<{temp:number, code:number, label:string}|null>} */
export async function getWeather() {
  const cached = readCache(WX_KEY);
  if (cached && Date.now() - cached.ts < WX_TTL) return cached.data;
  try {
    const { lat, lon, label } = await silentCoords();
    const j = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
    );
    const data = {
      temp: Math.round(j.current.temperature_2m),
      code: j.current.weather_code,
      label,
    };
    writeCache(WX_KEY, data);
    return data;
  } catch {
    return cached?.data || null; // stale is better than nothing
  }
}

/** @returns {Promise<{USD:number, EUR:number, GBP:number}|null>} rands per 1 unit of foreign currency */
export async function getRates() {
  const cached = readCache(FX_KEY);
  if (cached && Date.now() - cached.ts < FX_TTL) return cached.data;
  try {
    const j = await fetchJson(
      "https://api.frankfurter.dev/v1/latest?base=ZAR&symbols=USD,EUR,GBP"
    );
    const data = {};
    for (const [cur, rate] of Object.entries(j.rates || {})) {
      if (rate > 0) data[cur] = Math.round((1 / rate) * 100) / 100;
    }
    if (!Object.keys(data).length) throw new Error("empty rates");
    writeCache(FX_KEY, data);
    return data;
  } catch {
    return cached?.data || null;
  }
}

/** Map WMO weather codes to a simple glyph. */
export function weatherEmoji(code) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}
