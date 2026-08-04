import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SalesAPI, ProfileAPI } from "../api/client";
import { salesForDay, cashupSummary, drawerVariance, cashupText } from "../lib/cashup";
import { openExternalUrl, isCapacitorNative } from "../lib/platform";
import { Button } from "./ui/Button";
import { SkeletonText } from "./ui/Skeleton";
import { X, Printer, Share2, Copy, Calculator } from "lucide-react";
import toast from "react-hot-toast";

const fmtR = (n) =>
  "R " + (Number(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * End-of-day cash-up: split the day's takings by payment method, reconcile
 * the cash drawer (float + cash sales − refunds vs counted), then print or
 * share the summary. Inspired by the cash management flows in Yoco/Loyverse.
 */
export default function CashUpDialog({ date, onClose }) {
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [unknownAsCash, setUnknownAsCash] = useState(true);

  const salesQuery = useQuery({ queryKey: ["all-sales"], queryFn: () => SalesAPI.list(), staleTime: 30000 });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => ProfileAPI.get(), staleTime: 60000 });

  const summary = useMemo(
    () => cashupSummary(salesForDay(salesQuery.data || [], date), { treatUnknownAsCash: unknownAsCash }),
    [salesQuery.data, date, unknownAsCash]
  );
  const drawer = useMemo(
    () => ({ ...drawerVariance(summary, openingFloat, countedCash), float: Number(openingFloat) || 0 }),
    [summary, openingFloat, countedCash]
  );
  const counted = countedCash !== "";
  const varianceTone =
    Math.abs(drawer.variance) < 0.005
      ? "text-accent-600 dark:text-accent-400"
      : Math.abs(drawer.variance) <= 20
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const shareText = () =>
    cashupText(date, profileQuery.data?.store_name, summary, counted ? drawer : null);

  const handleWhatsApp = () => {
    openExternalUrl(`https://wa.me/?text=${encodeURIComponent(shareText())}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      toast.success("Summary copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Calculator size={20} className="text-brand-500" />
            End of day · {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
            <X size={20} />
          </button>
        </div>

        {salesQuery.isLoading ? (
          <SkeletonText lines={5} />
        ) : (
          <>
            {/* Printable summary */}
            <div data-print-area className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-center font-semibold text-slate-800 dark:text-white pb-2 border-b border-dashed border-slate-200 dark:border-slate-600">
                {profileQuery.data?.store_name || "Your Store"} — {date}
              </p>
              <Row label={`Sales (${summary.saleCount})`} value={fmtR(summary.grossSales)} strong />
              <Row label="· Cash" value={fmtR(summary.cashSales)} />
              <Row label="· Card" value={fmtR(summary.cardSales)} />
              {summary.unknownSales > 0 && (
                <Row label={`· Unspecified${unknownAsCash ? " (counted as cash)" : ""}`} value={fmtR(summary.unknownSales)} />
              )}
              {summary.returnCount > 0 && (
                <Row label={`Refunds (${summary.returnCount})`} value={`− ${fmtR(summary.refunds)}`} tone="text-rose-600 dark:text-rose-400" />
              )}
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                <Row label="Net takings" value={fmtR(summary.netTotal)} strong />
              </div>
              {counted && (
                <div className="border-t border-slate-200 dark:border-slate-600 pt-2 space-y-1">
                  <Row label="Opening float" value={fmtR(drawer.float)} />
                  <Row label="Expected cash in drawer" value={fmtR(drawer.expected)} />
                  <Row label="Counted cash" value={fmtR(drawer.counted)} />
                  <Row
                    label="Variance"
                    value={`${drawer.variance >= 0 ? "+" : "−"} ${fmtR(Math.abs(drawer.variance))}`}
                    tone={varianceTone}
                    strong
                  />
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Opening float</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Counted cash</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
                />
              </label>
            </div>
            {summary.unknownSales > 0 && (
              <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unknownAsCash}
                  onChange={(e) => setUnknownAsCash(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                />
                Treat older sales without a recorded payment method as cash
              </label>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {/* No window.print() in Android's WebView — see Sell.jsx. */}
              {!isCapacitorNative() && (
                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                  <Printer size={15} /> Print
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                <Copy size={15} /> Copy
              </Button>
              <Button className="flex-1" onClick={handleWhatsApp}>
                <Share2 size={15} /> WhatsApp
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong = false, tone = "" }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={`${strong ? "font-semibold text-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
        {label}
      </span>
      <span className={`tabular-nums ${tone || (strong ? "font-bold text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200")}`}>
        {value}
      </span>
    </div>
  );
}
