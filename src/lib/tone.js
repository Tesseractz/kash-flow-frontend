// Semantic colour for business values, shared by every screen.
//
// The rule: colour must mean something. Green is money earned, rose is money
// going back out or a loss, amber is "thin — look at this", blue is neutral
// information. A value is never coloured for decoration, because once colour
// is decorative the eye stops trusting it.
//
// Bands and tone names are defined once here so the Transactions table, the
// Dashboard and the Products list cannot drift apart.

/** Tone names shared with the Badge component's vocabulary. */
export const TONE = {
  good: 'success',
  bad: 'danger',
  warn: 'warning',
  info: 'info',
  flat: 'neutral',
};

/** Text colour per tone. Both themes checked for contrast on their surface. */
export const TEXT_TONE = {
  success: 'text-accent-700 dark:text-accent-400',
  danger: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-brand-600 dark:text-brand-400',
  neutral: 'text-slate-500 dark:text-slate-400',
  ink: 'text-slate-900 dark:text-white',
  muted: 'text-slate-400 dark:text-slate-500',
};

/** Soft chip fill per tone, for inline pills inside dense tables. */
export const CHIP_TONE = {
  success: 'bg-accent-50 text-accent-700 ring-accent-200/70 dark:bg-accent-950/40 dark:text-accent-300 dark:ring-accent-900/50',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50',
  info: 'bg-brand-50 text-brand-700 ring-brand-200/70 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900/50',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

/** Money: earned reads green, refunded or negative reads rose, zero stays quiet. */
export function moneyTone(n) {
  const v = Number(n) || 0;
  if (v > 0) return 'success';
  if (v < 0) return 'danger';
  return 'neutral';
}

/**
 * Gross margin bands. Chosen for retail, where under 10% barely covers the
 * cost of making the sale and negative means the item was sold at a loss.
 */
export function marginBand(pct) {
  if (pct == null || !Number.isFinite(pct)) return 'neutral';
  if (pct < 0) return 'danger';
  if (pct < 10) return 'warning';
  if (pct < 30) return 'info';
  return 'success';
}

/** Stock level against the store's low-stock threshold. */
export function stockBand(qty, threshold = 10) {
  const q = Number(qty) || 0;
  if (q <= 0) return 'danger';
  if (q <= threshold) return 'warning';
  return 'success';
}

/** Transaction type. A return is not a failure, but it is an exception. */
export const TYPE_TONE = { sale: 'success', return: 'danger' };

/** How the customer paid. Distinct hues so a cash-up split reads instantly. */
export const PAYMENT_TONE = { cash: 'success', card: 'info' };

/**
 * Row background. Only the exception is tinted strongly; sales get the
 * faintest wash so a screen of them still reads as a table rather than a
 * block of colour.
 */
export const ROW_TINT = {
  sale: 'bg-accent-50/40 hover:bg-accent-50/80 dark:bg-accent-950/10 dark:hover:bg-accent-950/25',
  return: 'bg-rose-50/70 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/35',
};

/** Direction of change, with the option to invert for metrics where up is bad. */
export function deltaTone(pct, invert = false) {
  if (pct == null || !Number.isFinite(pct)) return 'neutral';
  if (Math.abs(pct) < 0.05) return 'neutral';
  const up = pct > 0;
  return (invert ? !up : up) ? 'success' : 'danger';
}

export const text = (tone) => TEXT_TONE[tone] || TEXT_TONE.neutral;
export const chip = (tone) => CHIP_TONE[tone] || CHIP_TONE.neutral;
