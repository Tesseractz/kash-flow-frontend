import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { SalesAPI, ProductsAPI, CustomersAPI, UsersAPI, PlanAPI } from "../api/client";
import {
  enrichTransactions,
  filterTransactions,
  sortTransactions,
  transactionTotals,
  transactionsToCSV,
} from "../lib/transactionUtils";
import {
  text,
  chip,
  moneyTone,
  marginBand,
  TYPE_TONE,
  PAYMENT_TONE,
  ROW_TINT,
} from "../lib/tone";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SkeletonText } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Search,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  RotateCcw,
  ImageIcon,
  X,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

const fmtR = (n) =>
  "R " + (Number(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGE_SIZES = [25, 50, 100];

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
];

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
const todayISO = () => new Date().toISOString().slice(0, 10);

function SortHeader({ label, k, sort, onSort, align = "left" }) {
  const active = sort.key === k;
  return (
    <th
      onClick={() => onSort(k)}
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 text-${align} ${
        active ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
      } hover:text-slate-700 dark:hover:text-slate-200 transition-colors`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </span>
    </th>
  );
}

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");

  const [q, setQ] = useState("");
  const [from, setFrom] = useState(dateParam || isoDaysAgo(30));
  const [to, setTo] = useState(dateParam || todayISO());
  const [type, setType] = useState("all");
  const [payment, setPayment] = useState("all");
  const [sort, setSort] = useState({ key: "timestamp", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(() => new Set());

  const salesQuery = useQuery({ queryKey: ["all-sales"], queryFn: () => SalesAPI.list(), staleTime: 30000 });
  const productsQuery = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: () => ProductsAPI.list({ page: 1, page_size: 1000 }),
    staleTime: 60000,
  });
  const customersQuery = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => CustomersAPI.list({ include_inactive: true }),
    staleTime: 120000,
    retry: false,
  });
  const usersQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => UsersAPI.list(),
    staleTime: 300000,
    retry: false,
  });
  const planQuery = useQuery({ queryKey: ["plan"], queryFn: () => PlanAPI.get(), staleTime: 60000 });
  const canExport = !!planQuery.data?.limits?.csv_export;

  const enriched = useMemo(
    () =>
      enrichTransactions(salesQuery.data || [], {
        products: productsQuery.data?.items || [],
        customers: Array.isArray(customersQuery.data) ? customersQuery.data : [],
        users: Array.isArray(usersQuery.data) ? usersQuery.data : [],
      }),
    [salesQuery.data, productsQuery.data, customersQuery.data, usersQuery.data]
  );

  // Narrowed by search and date only. The chip counts come from here, so a
  // chip shows what clicking it would give rather than what is already shown.
  const baseRows = useMemo(
    () => filterTransactions(enriched, { q, from, to }),
    [enriched, q, from, to]
  );
  const baseTotals = useMemo(() => transactionTotals(baseRows), [baseRows]);
  const payCounts = useMemo(() => {
    let cash = 0;
    let card = 0;
    let none = 0;
    for (const r of baseRows) {
      if (r.payment_method === "cash") cash += 1;
      else if (r.payment_method === "card") card += 1;
      else none += 1;
    }
    return { cash, card, none };
  }, [baseRows]);

  const filtered = useMemo(
    () => sortTransactions(filterTransactions(baseRows, { type, payment }), sort.key, sort.dir),
    [baseRows, type, payment, sort]
  );

  const totals = useMemo(() => transactionTotals(filtered), [filtered]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectedRows = filtered.filter((r) => selected.has(r.id));
  const selectedTotals = transactionTotals(selectedRows);

  const resetPage = () => setPage(1);

  const applyPreset = (key) => {
    if (key === "today") {
      setFrom(todayISO());
      setTo(todayISO());
    } else if (key === "7d") {
      setFrom(isoDaysAgo(7));
      setTo(todayISO());
    } else if (key === "30d") {
      setFrom(isoDaysAgo(30));
      setTo(todayISO());
    } else {
      setFrom("");
      setTo("");
    }
    resetPage();
  };

  const onSort = (k) => {
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" }));
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const exportCSV = (rows, label) => {
    if (!canExport) {
      toast.error("CSV export requires Pro or Business plan");
      return;
    }
    if (!rows.length) {
      toast.error("Nothing to export");
      return;
    }
    const blob = new Blob([transactionsToCSV(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${label}_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success(`Exported ${rows.length} transaction${rows.length === 1 ? "" : "s"}`);
  };

  const isLoading = salesQuery.isLoading || productsQuery.isLoading;

  const pctText = (v) => (v == null ? "\u2014" : v.toFixed(1) + "%");

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Transactions</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate tabular-nums">
            {filtered.length.toLocaleString()} of {enriched.length.toLocaleString()} rows
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={canExport ? "secondary" : "ghost"}
            size="xs"
            onClick={() => exportCSV(filtered, "filtered")}
            disabled={isLoading}
          >
            {canExport ? <Download size={13} /> : <Lock size={13} />}
            Export{filtered.length > 0 ? " (" + filtered.length + ")" : ""}
          </Button>
          <Button variant="ghost" size="xs" onClick={() => salesQuery.refetch()} disabled={salesQuery.isFetching} title="Refresh">
            <RefreshCw size={13} className={salesQuery.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Totals for the current selection. Cost and margin are the numbers a
          shop owner checks straight after revenue, and neither was shown. */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800">
          <Stat label="Revenue" value={fmtR(totals.revenue)} tone="ink" />
          <Stat label="Cost of goods" value={fmtR(totals.cost)} tone="muted" />
          <Stat label="Gross profit" value={fmtR(totals.profit)} tone={moneyTone(totals.profit)} />
          <Stat label="Margin" value={pctText(totals.margin)} tone={marginBand(totals.margin)} />
          <Stat label="Items sold" value={totals.items.toLocaleString("en-ZA")} tone="ink" />
          <Stat
            label="Refunded"
            value={fmtR(totals.refunded)}
            tone={totals.refunded > 0 ? "danger" : "neutral"}
            sub={totals.returnCount + (totals.returnCount === 1 ? " return" : " returns")}
          />
        </div>
      </div>

      {/* One-click narrowing. Counts come from the search and date range only,
          so a chip always shows exactly what clicking it will give you. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip tone="success" active={type === "sale"} count={baseTotals.saleCount}
          onClick={() => { setType(type === "sale" ? "all" : "sale"); resetPage(); }}>Sales</FilterChip>
        <FilterChip tone="danger" active={type === "return"} count={baseTotals.returnCount}
          onClick={() => { setType(type === "return" ? "all" : "return"); resetPage(); }}>Returns</FilterChip>
        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        <FilterChip tone="success" active={payment === "cash"} count={payCounts.cash}
          onClick={() => { setPayment(payment === "cash" ? "all" : "cash"); resetPage(); }}>Cash</FilterChip>
        <FilterChip tone="info" active={payment === "card"} count={payCounts.card}
          onClick={() => { setPayment(payment === "card" ? "all" : "card"); resetPage(); }}>Card</FilterChip>
        {payCounts.none > 0 && (
          <FilterChip tone="neutral" active={payment === "unspecified"} count={payCounts.none}
            title="Sales taken before the payment method was recorded"
            onClick={() => { setPayment(payment === "unspecified" ? "all" : "unspecified"); resetPage(); }}>Unspecified</FilterChip>
        )}
        {(type !== "all" || payment !== "all") && (
          <button type="button"
            onClick={() => { setType("all"); setPayment("all"); resetPage(); }}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Clear
          </button>
        )}
      </div>

      {/* Search and date range */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, SKU, customer, seller or #id..."
            value={q}
            onChange={(e) => { setQ(e.target.value); resetPage(); }}
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 outline-none"
          />
        </div>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }}
          className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand-500"
          aria-label="From date" />
        <span className="text-slate-400 text-xs">to</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }}
          className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand-500"
          aria-label="To date" />
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {PRESETS.map((pr) => (
            <button key={pr.key} onClick={() => applyPreset(pr.key)}
              className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900 transition">
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 dark:bg-brand-950/40 ring-1 ring-inset ring-brand-200/60 dark:ring-brand-900/40 px-3 py-2 text-xs">
          <span className="font-semibold text-brand-700 dark:text-brand-300 tabular-nums">
            {selected.size} selected &middot; {fmtR(selectedTotals.revenue)} &middot; profit {fmtR(selectedTotals.profit)}
          </span>
          <Button size="xs" variant="secondary" onClick={() => exportCSV(selectedRows, "selected")}>
            <Download size={12} /> Export selected
          </Button>
          <button onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5"><SkeletonText lines={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-8">
              <EmptyState icon={ShoppingBag} title="No transactions match"
                description="Try widening the date range or clearing the filters." compact />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full min-w-[1120px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-2 py-2 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 w-8">
                      <input type="checkbox" checked={pageAllSelected} onChange={togglePage} aria-label="Select page"
                        className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                    </th>
                    <SortHeader label="#" k="id" sort={sort} onSort={onSort} />
                    <SortHeader label="Date / time" k="timestamp" sort={sort} onSort={onSort} />
                    <SortHeader label="Product" k="product" sort={sort} onSort={onSort} />
                    <SortHeader label="Qty" k="quantity" sort={sort} onSort={onSort} align="right" />
                    <Th align="right">Unit</Th>
                    <SortHeader label="Total" k="total" sort={sort} onSort={onSort} align="right" />
                    <Th align="right">Cost</Th>
                    <SortHeader label="Profit" k="profit" sort={sort} onSort={onSort} align="right" />
                    <Th align="right">Margin</Th>
                    <Th>Pay</Th>
                    <Th>Customer</Th>
                    <Th>Sold by</Th>
                    <Th>Type</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const isSel = selected.has(r.id);
                    const rowCls = isSel ? "bg-brand-50 dark:bg-brand-950/40" : (ROW_TINT[r.type] || "");
                    return (
                      <tr key={r.id} className={"border-t border-slate-100 dark:border-slate-800 transition-colors " + rowCls}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={isSel} onChange={() => toggleRow(r.id)}
                            aria-label={"Select transaction " + r.id}
                            className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          #{r.id}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                            {new Date(r.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                          <span className="ml-1.5 text-[11px] text-slate-400 tabular-nums">
                            {new Date(r.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {r.image_url
                                ? <img src={r.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                : <ImageIcon className="w-3 h-3 text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[190px] leading-tight">
                                {r.product_name}
                              </p>
                              {r.sku && <p className="text-[10px] text-slate-400 font-mono truncate leading-tight">{r.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className={"px-2 py-1.5 text-right tabular-nums font-medium " + (r.quantity < 0 ? text("danger") : "text-slate-700 dark:text-slate-300")}>
                          {r.quantity}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {fmtR(r.unit_price)}
                        </td>
                        <td className={"px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap " + (r.total < 0 ? text("danger") : text("ink"))}>
                          {fmtR(r.total)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {r.cost == null ? "\u2014" : fmtR(r.cost)}
                        </td>
                        <td className={"px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap " + (r.profit == null ? text("muted") : text(moneyTone(r.profit)))}>
                          {r.profit == null ? "\u2014" : fmtR(r.profit)}
                        </td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          {r.margin == null ? (
                            <span className={text("muted")}>&mdash;</span>
                          ) : (
                            <span className={"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ring-1 ring-inset " + chip(marginBand(r.margin))}>
                              {r.margin.toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {r.payment_method ? (
                            <span className={"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ring-1 ring-inset " + chip(PAYMENT_TONE[r.payment_method] || "neutral")}>
                              {r.payment_method}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">&mdash;</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                          {r.customer_name || <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                          {r.sold_by_name || <span className="text-slate-300 dark:text-slate-600">&mdash;</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ring-1 ring-inset " + chip(TYPE_TONE[r.type])}>
                            {r.type === "return" ? <RotateCcw size={9} /> : <ShoppingBag size={9} />}
                            {r.type === "return" ? "Return" : "Sale"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
            {((page - 1) * pageSize + 1).toLocaleString()}&ndash;{Math.min(page * pageSize, filtered.length).toLocaleString()} of{" "}
            {filtered.length.toLocaleString()} &middot; page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
              className="h-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 text-[11px] text-slate-700 dark:text-slate-300 outline-none"
              aria-label="Rows per page">
              {PAGE_SIZES.map((sz) => <option key={sz} value={sz}>{sz} / page</option>)}
            </select>
            <Button variant="secondary" size="xs" onClick={() => setPage((pg) => Math.max(1, pg - 1))} disabled={page === 1}>
              <ChevronLeft size={13} />
            </Button>
            <Button variant="secondary" size="xs" onClick={() => setPage((pg) => Math.min(totalPages, pg + 1))} disabled={page === totalPages}>
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Plain heading for columns that are not sortable. */
function Th({ children, align = "left" }) {
  const alignCls = align === "right" ? "text-right" : "text-left";
  return (
    <th className={"px-2 py-2 " + alignCls + " text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 whitespace-nowrap"}>
      {children}
    </th>
  );
}

function Stat({ label, value, sub, tone = "ink" }) {
  return (
    <div className="px-3.5 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 truncate">{label}</p>
      <p className={"mt-1 text-base font-semibold tabular-nums leading-none truncate " + text(tone)}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">{sub}</p>}
    </div>
  );
}

function FilterChip({ children, count, tone, active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={"inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset transition " + chip(tone) + (active ? " ring-2 ring-current shadow-sm" : " hover:brightness-95 dark:hover:brightness-110")}
    >
      {children}
      <span className="tabular-nums opacity-75">{count.toLocaleString()}</span>
    </button>
  );
}
