import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from "react-router-dom";
import { ProductsAPI, AlertsAPI, PlanAPI } from "../api/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import { Dialog } from "../components/ui/Dialog";
import ImageUpload from "../components/ImageUpload";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  getCachedProducts,
  setCachedProducts,
  getProductOps,
  setProductOps,
  syncProductOps,
} from "../lib/offlineSync";

const TEMP_ID_PREFIX = "temp-";

function formatZAR(value) {
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `R ${Number(value || 0).toFixed(2)}`;
  }
}

export default function Products() {
  const qc = useQueryClient();
  const isOnline = useOnlineStatus();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddForm, setShowAddForm] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [cachedProducts, setCachedProductsState] = useState(() =>
    getCachedProducts()
  );
  const [productOps, setProductOpsState] = useState(() => getProductOps());
  const hasPendingProductOps = productOps.length > 0;
  const productsKey = ["products", { q: search || undefined, page, pageSize }];

  const productsQuery = useQuery({
    queryKey: productsKey,
    queryFn: () =>
      ProductsAPI.list({ q: search || undefined, page, page_size: pageSize }),
    keepPreviousData: true,
    enabled: isOnline,
  });

  const planQuery = useQuery({
    queryKey: ["plan"],
    queryFn: () => PlanAPI.get(),
    staleTime: 60000,
    enabled: isOnline,
  });

  const lowStockQuery = useQuery({
    queryKey: ["lowStock"],
    queryFn: () => AlertsAPI.getLowStock(10),
    enabled: isOnline && planQuery.data?.limits?.low_stock_alerts === true,
    staleTime: 30000,
  });

  const canViewAlerts = planQuery.data?.limits?.low_stock_alerts;

  useEffect(() => {
    if (productsQuery.data?.items?.length) {
      setCachedProductsState(productsQuery.data.items);
      setCachedProducts(productsQuery.data.items);
    }
  }, [productsQuery.data?.items]);

  const updateProductOps = (ops) => {
    setProductOpsState(ops);
    setProductOps(ops);
  };

  const updateCachedProducts = (next) => {
    setCachedProductsState(next);
    setCachedProducts(next);
  };

  const applyLocalUpdate = (id, data) => {
    updateCachedProducts(
      cachedProducts.map((product) =>
        product.id === id ? { ...product, ...data } : product
      )
    );
  };

  const applyLocalDelete = (id) => {
    updateCachedProducts(cachedProducts.filter((product) => product.id !== id));
  };

  const enqueueCreate = (data) => {
    const tempId = `${TEMP_ID_PREFIX}${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
    const newProduct = {
      id: tempId,
      ...data,
      image_url: imageUrl || undefined,
      quantity: Number(data.quantity || 0),
      price: Number(data.price || 0),
      cost_price: Number(data.cost_price || 0),
    };
    updateCachedProducts([newProduct, ...cachedProducts]);
    updateProductOps([
      ...productOps,
      { type: "create", tempId, data: newProduct },
    ]);
    return tempId;
  };

  const enqueueUpdate = (id, data) => {
    const nextOps = productOps.map((op) => {
      if (op.type === "create" && op.tempId === id) {
        return { ...op, data: { ...op.data, ...data } };
      }
      if (op.type === "update" && op.id === id) {
        return { ...op, data: { ...op.data, ...data } };
      }
      return op;
    });
    const hasExisting = nextOps.some(
      (op) =>
        (op.type === "create" && op.tempId === id) ||
        (op.type === "update" && op.id === id)
    );
    if (!hasExisting) {
      nextOps.push({ type: "update", id, data });
    }
    updateProductOps(nextOps);
  };

  const enqueueDelete = (id) => {
    const nextOps = productOps.filter(
      (op) =>
        !(op.type === "update" && op.id === id) &&
        !(op.type === "create" && op.tempId === id)
    );
    if (!(typeof id === "string" && id.startsWith(TEMP_ID_PREFIX))) {
      nextOps.push({ type: "delete", id });
    }
    updateProductOps(nextOps);
  };

  const syncOfflineChanges = async () => {
    if (!isOnline || !hasPendingProductOps) return;
    const result = await syncProductOps(ProductsAPI);
    setCachedProductsState(getCachedProducts());
    setProductOpsState(getProductOps());
    if (result.productsSynced > 0) {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        `Synced ${result.productsSynced} product change${
          result.productsSynced > 1 ? "s" : ""
        }`
      );
    }
  };

  useEffect(() => {
    if (isOnline && hasPendingProductOps) {
      syncOfflineChanges();
    }
  }, [isOnline, hasPendingProductOps]);

  const createMutation = useMutation({
    mutationFn: ProductsAPI.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product added successfully");
      form.reset();
      setImageUrl("");
      setShowAddForm(false);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || "Failed to add product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ProductsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ProductsAPI.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const schema = z.object({
    sku: z.string().max(255).optional(),
    name: z.string().min(1, "Name is required"),
    price: z.coerce.number().nonnegative("Price must be >= 0"),
    quantity: z.coerce.number().int().nonnegative("Quantity must be >= 0"),
    cost_price: z
      .union([
        z.coerce.number().nonnegative(),
        z.literal("").transform(() => 0),
      ])
      .optional(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "",
      name: "",
      price: "",
      quantity: "",
      cost_price: "",
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const products = productsQuery.data?.items || cachedProducts || [];
  const total = productsQuery.data?.total || products.length || 0;
  const usingCachedProducts =
    !productsQuery.data?.items && cachedProducts && cachedProducts.length > 0;

  const handleSubmit = (values) => {
    if (!isOnline) {
      enqueueCreate({ ...values, image_url: imageUrl || undefined });
      toast.success("Product saved offline.");
      form.reset();
      setImageUrl("");
      setShowAddForm(false);
      return;
    }
    createMutation.mutate({
      ...values,
      image_url: imageUrl || undefined,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            Products
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your product inventory
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              if (!isOnline) {
                toast("Offline: product will be saved locally.");
              }
              setShowAddForm(!showAddForm);
            }}
          >
            <Plus size={18} />
            Add Product
          </Button>
        )}
      </div>

      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Ready to sell?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Jump straight into the Sell screen to process a transaction.
            </p>
          </div>
          <Link to="/sell">
            <Button variant="primary" size="sm">
              Go to Sell
            </Button>
          </Link>
        </CardContent>
      </Card>

      {!isOnline && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                  Offline mode
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  You can still add, edit, and delete products while offline.
                  Changes will sync when you’re back online.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {!isOnline && !usingCachedProducts && (
        <Card className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <CardContent className="py-4 text-sm text-slate-600 dark:text-slate-300">
            No cached products available. Connect to load inventory.
          </CardContent>
        </Card>
      )}
      {isOnline && hasPendingProductOps && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
          <CardContent className="py-4 text-sm text-blue-700 dark:text-blue-300 flex items-center justify-between gap-3">
            <span>
              {productOps.length} product change
              {productOps.length > 1 ? "s" : ""} pending sync.
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => syncOfflineChanges()}
            >
              Sync now
            </Button>
          </CardContent>
        </Card>
      )}
      {isOnline && usingCachedProducts && (
        <Card className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  Using cached products
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Live data failed to load. Showing last saved inventory.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canViewAlerts && lowStockQuery.data && lowStockQuery.data.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                  Low Stock Alert
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  {lowStockQuery.data.length} product
                  {lowStockQuery.data.length > 1 ? "s" : ""} running low on
                  stock:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockQuery.data.slice(0, 5).map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                    >
                      {p.name} ({p.quantity} left)
                    </span>
                  ))}
                  {lowStockQuery.data.length > 5 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300">
                      +{lowStockQuery.data.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!canViewAlerts && (
        <Card className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  Low Stock Alerts
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Upgrade to Pro or Business to see low stock alerts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
            <CardDescription>
              Fill in the details to add a new product to your inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Image Upload */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product Image
                  </label>
                  <ImageUpload
                    value={imageUrl}
                    onChange={setImageUrl}
                    size="lg"
                  />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Product Code
                    </label>
                    <input
                      placeholder="PRD-001"
                      {...form.register("sku")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Name *
                    </label>
                    <input
                      placeholder="Product name"
                      {...form.register("name")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Price (ZAR) *
                    </label>
                    <input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...form.register("price")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Quantity *
                    </label>
                    <input
                      placeholder="0"
                      type="number"
                      {...form.register("quantity")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Cost Price
                    </label>
                    <input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...form.register("cost_price")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  {(form.formState.errors.name ||
                    form.formState.errors.price ||
                    form.formState.errors.quantity) && (
                    <p className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle size={16} />
                      {form.formState.errors.name?.message ||
                        form.formState.errors.price?.message ||
                        form.formState.errors.quantity?.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setImageUrl("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add Product"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>{total} products in your store</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm sm:text-base text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <select
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm sm:text-base text-slate-800 dark:text-white px-3 py-2.5 sm:py-2 focus:border-blue-500 outline-none"
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {productsQuery.isLoading ? (
            <div className="p-8 text-center text-slate-500">
              Loading products...
            </div>
          ) : productsQuery.isError ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className="text-red-600 font-medium">
                {productsQuery.error?.response?.status === 401
                  ? "Session expired. Please sign out and sign in again."
                  : "Failed to load products"}
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No products yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Add your first product to get started
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {products.map((p) => (
                  <div key={p.id} className="p-4 flex gap-3">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white truncate">
                            {p.name}
                          </p>
                          {p.sku && (
                            <p className="text-xs text-slate-500 font-mono">
                              {p.sku}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            p.quantity === 0
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                              : p.quantity <= 5
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                          }`}
                        >
                          {p.quantity}
                        </span>
                      </div>
                      <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                        {formatZAR(p.price)}
                      </p>
                      {isAdmin && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(p);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"?`)) {
                                if (!isOnline) {
                                  enqueueDelete(p.id);
                                  applyLocalDelete(p.id);
                                  toast.success("Product deleted offline.");
                                } else {
                                  deleteMutation.mutate(p.id);
                                }
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 size={14} /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stock
                      </th>
                      {isAdmin && (
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Cost
                        </th>
                      )}
                      {isAdmin && (
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">
                                {p.name}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                ID: {p.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">
                            {p.sku || "-"}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">
                          {formatZAR(p.price)}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              p.quantity === 0
                                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                : p.quantity <= 5
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                            }`}
                          >
                            {p.quantity} in stock
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                            {formatZAR(p.cost_price ?? 0)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditing(p);
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete "${p.name}"?`)) {
                                    if (!isOnline) {
                                      enqueueDelete(p.id);
                                      applyLocalDelete(p.id);
                                      toast.success("Product deleted offline.");
                                    } else {
                                      deleteMutation.mutate(p.id);
                                    }
                                  }
                                }}
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {products.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {page}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={total <= page * pageSize}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditDialog
        open={editOpen}
        product={editing}
        onClose={() => setEditOpen(false)}
        onSave={(id, data) => {
          if (!isOnline) {
            enqueueUpdate(id, data);
            applyLocalUpdate(id, data);
            setEditOpen(false);
            toast.success("Product updated offline.");
            return;
          }
          updateMutation.mutate({ id, data });
        }}
      />
    </div>
  );
}

function EditDialog({ open, product, onClose, onSave }) {
  const [editImageUrl, setEditImageUrl] = useState("");

  // Reset image URL when product changes
  useState(() => {
    if (product) {
      setEditImageUrl(product.image_url || "");
    }
  }, [product]);

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    price: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().int().nonnegative(),
    cost_price: z.coerce.number().nonnegative().optional(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    values: product
      ? {
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          cost_price: product.cost_price ?? 0,
        }
      : { name: "", price: 0, quantity: 0, cost_price: 0 },
  });

  // Update editImageUrl when product changes
  if (product && editImageUrl !== (product.image_url || "") && !open) {
    setEditImageUrl(product.image_url || "");
  }

  const handleSave = (values) => {
    onSave(product.id, {
      ...values,
      image_url: editImageUrl || undefined,
    });
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit Product"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(handleSave)}>Save Changes</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Image */}
        <div className="flex gap-4">
          <ImageUpload
            value={editImageUrl || product.image_url || ""}
            onChange={setEditImageUrl}
            size="lg"
          />
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Product Name
            </label>
            <input
              {...form.register("name")}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Price (ZAR)
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("price")}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Quantity
            </label>
            <input
              type="number"
              {...form.register("quantity")}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Cost Price
            </label>
            <input
              type="number"
              step="0.01"
              {...form.register("cost_price")}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
