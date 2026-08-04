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
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
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

  const filtered = useMemo(
    () => sortTransactions(filterTransactions(enriched, { q, from, to, type }), sort.key, sort.dir),
    [enriched, q, from, to, type, sort]
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Every sale and return — search, filter, select and export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={canExport ? "secondary" : "ghost"}
            size="sm"
            onClick={() => exportCSV(filtered, "filtered")}
            disabled={isLoading}
          >
            {canExport ? <Download size={15} /> : <Lock size={15} />}
            Export {filtered.length > 0 ? `(${filtered.length})` : ""}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => salesQuery.refetch()} disabled={salesQuery.isFetching}>
            <RefreshCw size={15} className={salesQuery.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search product, SKU, customer, seller or #id…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  resetPage();
                }}
                className="w-full pl-9 pr-3 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:shadow-focus-ring outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  resetPage();
                }}
                className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
                aria-label="From date"
              />
              <span className="text-slate-400 text-sm">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  resetPage();
                }}
                className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
                aria-label="To date"
              />
            </div>

            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                resetPage();
              }}
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-brand-500"
              aria-label="Type filter"
            >
              <option value="all">All types</option>
              <option value="sale">Sales only</option>
              <option value="return">Returns only</option>
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-800">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-900 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 ring-1 ring-inset ring-brand-200/60 dark:ring-brand-900/40 px-4 py-2.5 text-sm">
          <span className="font-semibold text-brand-700 dark:text-brand-300 tabular-nums">
            {selected.size} selected · {fmtR(selectedTotals.revenue)}
          </span>
          <Button size="xs" variant="secondary" onClick={() => exportCSV(selectedRows, "selected")}>
            <Download size={13} /> Export selected
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X size={13} /> Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <SkeletonText lines={6} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={ShoppingBag}
                title="No transactions match"
                description="Try widening the date range or clearing the search."
                compact
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2.5 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 w-10">
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={togglePage}
                        aria-label="Select page"
                        className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </th>
                    <SortHeader label="#" k="id" sort={sort} onSort={onSort} />
                    <SortHeader label="Date / Time" k="timestamp" sort={sort} onSort={onSort} />
                    <SortHeader label="Product" k="product" sort={sort} onSort={onSort} />
                    <SortHeader label="Qty" k="quantity" sort={sort} onSort={onSort} align="right" />
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 whitespace-nowrap">
                      Unit
                    </th>
                    <SortHeader label="Total" k="total" sort={sort} onSort={onSort} align="right" />
                    <SortHeader label="Profit" k="profit" sort={sort} onSort={onSort} align="right" />
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                      Customer
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                      Sold by
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const isSel = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`border-t border-slate-100 dark:border-slate-800 transition-colors ${
                          isSel
                            ? "bg-brand-50/70 dark:bg-brand-950/30"
                            : r.type === "return"
                            ? "bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleRow(r.id)}
                            aria-label={`Select transaction ${r.id}`}
                            className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          #{r.id}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 tabular-nums">
                            {new Date(r.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </div>
                          <div className="text-xs text-slate-400 tabular-nums">
                            {new Date(r.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="px-3 py-2 min-w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {r.image_url ? (
                                <img src={r.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[220px]">
                                {r.product_name}
                              </p>
                              {r.sku && <p className="text-[11px] text-slate-400 font-mono truncate">{r.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {r.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {fmtR(r.unit_price)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${
                            r.total < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {fmtR(r.total)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${
                            r.profit == null
                              ? "text-slate-400"
                              : r.profit < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-accent-700 dark:text-accent-400"
                          }`}
                        >
                          {r.profit == null ? "—" : fmtR(r.profit)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                          {r.customer_name || <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                          {r.sold_by_name || <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {r.type === "return" ? (
                            <Badge tone="danger" size="sm" icon={RotateCcw}>
                              Return
                            </Badge>
                          ) : (
                            <Badge tone="success" size="sm" icon={ShoppingBag}>
                              Sale
                            </Badge>
                          )}
                          {r.payment_method && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 capitalize">
                              {r.payment_method}
                            </p>
                          )}
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

      {/* Totals + pagination footer */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="tabular-nums">
              <strong className="text-slate-900 dark:text-white">{totals.count}</strong> row{totals.count === 1 ? "" : "s"}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="tabular-nums">{totals.saleCount} sales</span>
            {totals.returnCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="tabular-nums text-rose-600 dark:text-rose-400">{totals.returnCount} returns</span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="tabular-nums">
              Net <strong className="text-slate-900 dark:text-white">{fmtR(totals.revenue)}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="tabular-nums">Profit {fmtR(totals.profit)}</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                resetPage();
              }}
              className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-700 dark:text-slate-300 outline-none"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={15} />
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums min-w-[52px] text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
