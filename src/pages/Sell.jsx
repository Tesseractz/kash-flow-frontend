import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ProductsAPI, SalesAPI, NotificationsAPI } from "../api/client";
import toast from "react-hot-toast";
import { Button } from "../components/ui/Button";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  OFFLINE_SALES_KEY,
  PRODUCT_CACHE_KEY,
  getOfflineSales,
  setOfflineSales,
  getCachedProducts,
  setCachedProducts,
  syncAllOffline,
} from "../lib/offlineSync";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Mail,
  X,
  Send,
  Search,
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  ImageIcon,
  Trash2,
} from "lucide-react";

const PRODUCTS_PER_PAGE = 12;
const OFFLINE_QUEUE_KEY = OFFLINE_SALES_KEY;

export default function Sell() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  // Cart state - array of { product, quantity }
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const isOnline = useOnlineStatus();
  const [offlineQueue, setOfflineQueue] = useState(() => getOfflineSales());
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedProducts, setCachedProductsState] = useState(() =>
    getCachedProducts()
  );

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");

  // Receipt modal state
  const [receiptModal, setReceiptModal] = useState({
    open: false,
    saleIds: [],
    total: 0,
    items: [],
    paymentMethod: "cash",
    paymentAmount: 0,
    change: 0,
    offline: false,
  });
  const [receiptEmail, setReceiptEmail] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: () => ProductsAPI.list({ page: 1, page_size: 1000 }),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (productsQuery.data?.items?.length) {
      setCachedProductsState(productsQuery.data.items);
      setCachedProducts(productsQuery.data.items);
    }
  }, [productsQuery.data?.items]);

  const updateOfflineQueue = (queue) => {
    setOfflineQueue(queue);
    setOfflineSales(queue);
  };

  const syncOfflineSales = async (source = "auto") => {
    if (!isOnline || isSyncing || offlineQueue.length === 0) return;
    setIsSyncing(true);
    const result = await syncAllOffline({ ProductsAPI, SalesAPI });
    updateOfflineQueue(getOfflineSales());
    setIsSyncing(false);

    if (result.salesSynced > 0 || result.productsSynced > 0) {
      qc.invalidateQueries({ queryKey: ["products-for-sale"] });
      qc.invalidateQueries({ queryKey: ["recent-sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        `Synced ${result.salesSynced} sale${
          result.salesSynced > 1 ? "s" : ""
        } and ${result.productsSynced} product change${
          result.productsSynced > 1 ? "s" : ""
        }`
      );
    }
  };

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineSales("auto");
    }
  }, [isOnline, offlineQueue.length]);

  // Filter and paginate products
  const allProducts = productsQuery.data?.items || cachedProducts || [];
  const usingCachedProducts =
    !productsQuery.data?.items && cachedProducts && cachedProducts.length > 0;

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return allProducts;
    const query = searchQuery.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    );
  }, [allProducts, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const paymentAmountNum = parseFloat(paymentAmount) || 0;
  const change =
    paymentMethod === "cash" ? Math.max(0, paymentAmountNum - cartTotal) : 0;
  const canCompleteSale =
    cart.length > 0 &&
    (paymentMethod === "card" || paymentAmountNum >= cartTotal);

  // Cart functions
  const addToCart = (product) => {
    if (product.quantity === 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // Check if we can add more
        if (existing.quantity >= product.quantity) {
          toast.error(`Only ${product.quantity} in stock`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    if (!showCart && window.innerWidth < 1024) {
      // Show cart indicator on mobile
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;

      if (newQuantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }

      if (newQuantity > item.product.quantity) {
        toast.error(`Only ${item.product.quantity} in stock`);
        return prev;
      }

      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQuantity } : i
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentAmount("");
    setPaymentMethod("cash");
  };

  const handleSell = async () => {
    if (isSubmitting || cart.length === 0) return;

    // Validate all items
    for (const item of cart) {
      if (item.quantity > item.product.quantity) {
        toast.error(
          `Only ${item.product.quantity} of ${item.product.name} in stock`
        );
        return;
      }
    }

    if (paymentMethod === "cash" && paymentAmountNum < cartTotal) {
      toast.error("Payment amount is less than total");
      return;
    }

    if (!isOnline) {
      const offlineSale = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        paymentMethod,
        paymentAmount: paymentMethod === "cash" ? paymentAmountNum : cartTotal,
        change,
        total: cartTotal,
        items: cart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        })),
      };

      updateOfflineQueue([...offlineQueue, offlineSale]);
      const updatedProducts = cachedProducts.map((product) => {
        const sold = offlineSale.items.find(
          (item) => item.product_id === product.id
        );
        if (!sold) return product;
        const nextQty = Math.max(0, (product.quantity || 0) - sold.quantity);
        return { ...product, quantity: nextQty };
      });
      setCachedProductsState(updatedProducts);
      setCachedProducts(updatedProducts);
      toast.success("Sale saved offline. Will sync when online.");

      setReceiptModal({
        open: true,
        saleIds: [],
        total: cartTotal,
        items: offlineSale.items,
        paymentMethod: paymentMethod,
        paymentAmount: offlineSale.paymentAmount,
        change: offlineSale.change,
        offline: true,
      });

      clearCart();
      setShowCart(false);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create sales for each cart item
      const salePromises = cart.map((item) =>
        SalesAPI.create({
          product_id: item.product.id,
          quantity_sold: item.quantity,
        })
      );

      const sales = await Promise.all(salePromises);

      toast.success(`Sale complete! Total: R ${cartTotal.toFixed(2)}`);

      setReceiptModal({
        open: true,
        saleIds: sales.map((s) => s.id),
        total: cartTotal,
        items: cart.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        })),
        paymentMethod: paymentMethod,
        paymentAmount: paymentMethod === "cash" ? paymentAmountNum : cartTotal,
        change: change,
        offline: false,
      });

      clearCart();
      setShowCart(false);

      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["products-for-sale"] });
        qc.invalidateQueries({ queryKey: ["recent-sales"] });
        qc.invalidateQueries({ queryKey: ["products"] });
      }, 100);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to process sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReceipt = async () => {
    if (receiptModal.saleIds.length === 0) return;
    if (!isOnline || receiptModal.offline) {
      toast.error("Receipts can be sent when you are back online");
      return;
    }

    const email = receiptEmail.trim();
    if (!email) {
      toast.error("Please enter a customer email");
      return;
    }

    setSendingReceipt(true);
    try {
      // Send receipt for the first sale (includes all items in the email)
      const result = await NotificationsAPI.sendReceipt({
        sale_id: receiptModal.saleIds[0],
        customer_email: email,
        send_email: true,
        payment_method: receiptModal.paymentMethod,
        payment_amount: receiptModal.paymentAmount,
        change_amount: receiptModal.change,
      });

      if (result.success) {
        toast.success("Receipt sent to " + email);
        closeReceiptModal();
      } else {
        const failedResults = result.results?.filter((r) => !r.success) || [];
        if (failedResults.length > 0) {
          const errorMsg = failedResults[0].message || "Failed to send receipt";
          toast.error(errorMsg);
        } else {
          toast.error("Failed to send receipt");
        }
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast.error(detail || "Failed to send receipt");
    } finally {
      setSendingReceipt(false);
    }
  };

  const closeReceiptModal = () => {
    setReceiptModal({
      open: false,
      saleIds: [],
      total: 0,
      items: [],
      paymentMethod: "cash",
      paymentAmount: 0,
      change: 0,
      offline: false,
    });
    setReceiptEmail("");
  };

  // Check if product is in cart
  const getCartQuantity = (productId) => {
    const item = cart.find((i) => i.product.id === productId);
    return item?.quantity || 0;
  };
  const hasPendingOfflineSales = offlineQueue.length > 0;
  const canSendReceipt = isOnline && !receiptModal.offline;

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-3 sm:space-y-4 pb-24 lg:pb-0">
      {/* Mobile: Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="lg:hidden fixed bottom-5 right-5 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full text-xs font-bold flex items-center justify-center">
            {cartItemCount}
          </span>
        </button>
      )}

      {/* Mobile: Cart Slide-Over */}
      {showCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShoppingCart size={20} />
                Cart ({cartItemCount})
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">{renderCartPanel()}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
        {/* Products Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">
                      {t("sell.select_product")}
                    </CardTitle>
                    <CardDescription className="hidden sm:block">
                      Tap products to add to cart
                    </CardDescription>
                  </div>
                </div>
                {!isOnline && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    Offline mode: sales will be saved and synced later.
                  </div>
                )}
                {isOnline && usingCachedProducts && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <AlertCircle className="h-4 w-4" />
                    Using cached products. Data may be outdated.
                  </div>
                )}
                {isOnline && hasPendingOfflineSales && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {offlineQueue.length} offline sale
                      {offlineQueue.length > 1 ? "s" : ""} pending sync.
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => syncOfflineSales("manual")}
                      disabled={isSyncing}
                    >
                      {isSyncing ? "Syncing..." : "Sync now"}
                    </Button>
                  </div>
                )}
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("products.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm sm:text-base text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pb-4 px-4 py-3 sm:px-6 sm:py-4">
              {productsQuery.isLoading && !usingCachedProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">
                    {searchQuery
                      ? "No products match your search"
                      : t("products.no_products")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
                    {paginatedProducts.map((p) => {
                      const inCart = getCartQuantity(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => addToCart(p)}
                          disabled={p.quantity === 0}
                          className={`relative flex flex-col aspect-square rounded-xl border-2 text-left transition-all duration-200 overflow-hidden active:scale-[0.98] ${
                            inCart > 0
                              ? "border-blue-600 ring-2 ring-blue-600/20 shadow-lg"
                              : p.quantity === 0
                              ? "border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
                              : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md bg-white dark:bg-slate-800"
                          }`}
                        >
                          {/* Product Image */}
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 flex items-center justify-center min-h-0 overflow-hidden">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 dark:text-slate-600" />
                            )}
                          </div>

                          {/* Product Info - Horizontal Layout */}
                          <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-white truncate">
                                {p.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                                  R{Number(p.price).toFixed(0)}
                                </p>
                                {p.sku && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                                    {p.sku}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-xs sm:text-sm px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                                p.quantity === 0
                                  ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                                  : p.quantity <= 5
                                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                                  : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {p.quantity === 0 ? "Out" : p.quantity}
                            </span>
                          </div>

                          {/* In cart indicator */}
                          {inCart > 0 && (
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {inCart}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="text-sm text-slate-600 dark:text-slate-400 px-3 min-w-[60px] text-center">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Panel - Desktop only */}
        <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
          <Card className="sticky top-4 flex flex-col max-h-[calc(100vh-8rem)]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cartItemCount})
                </CardTitle>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto py-4">
              {renderCartPanel()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeReceiptModal}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeReceiptModal}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <X size={20} />
            </button>

            {/* Receipt Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                Sale Complete!
              </h3>
              {receiptModal.offline && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Saved offline. Sync to update inventory.
                </p>
              )}
            </div>

            {/* Receipt Details */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 space-y-3">
              {/* Items */}
              <div className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-600">
                {receiptModal.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-white">
                      R {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Payment
                </span>
                <span className="font-medium text-slate-800 dark:text-white flex items-center gap-1">
                  {receiptModal.paymentMethod === "card" ? (
                    <CreditCard size={14} />
                  ) : (
                    <Banknote size={14} />
                  )}
                  {receiptModal.paymentMethod === "card" ? "Card" : "Cash"}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-600 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    R {receiptModal.total.toFixed(2)}
                  </span>
                </div>

                {receiptModal.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        Tendered
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        R {receiptModal.paymentAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Change Due
                      </span>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        R {receiptModal.change.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Send Receipt Form */}
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                Send receipt to customer (optional)
              </p>
              {!canSendReceipt && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                  Receipts can be sent when you are back online.
                </p>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={receiptEmail}
                  onChange={(e) => setReceiptEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={closeReceiptModal}
                >
                  Done
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendReceipt}
                  disabled={
                    sendingReceipt || !receiptEmail.trim() || !canSendReceipt
                  }
                >
                  <Send size={16} />
                  {sendingReceipt ? "..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderCartPanel() {
    if (cart.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12">
          <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Cart is empty</p>
          <p className="text-sm mt-1">Tap products to add</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-2 max-h-[40vh] overflow-auto">
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="flex gap-3 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
            >
              {/* Product Image */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-white truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-slate-500">
                  R {Number(item.product.price).toFixed(2)} each
                </p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    updateCartQuantity(item.product.id, item.quantity - 1)
                  }
                  className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                >
                  <Minus size={12} />
                </button>
                <span className="w-7 sm:w-8 text-center font-bold text-slate-800 dark:text-white text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    updateCartQuantity(item.product.id, item.quantity + 1)
                  }
                  disabled={item.quantity >= item.product.quantity}
                  className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl border-2 transition-all ${
                paymentMethod === "cash"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Banknote size={18} />
              <span className="font-semibold text-sm sm:text-base">Cash</span>
            </button>
            <button
              onClick={() => {
                setPaymentMethod("card");
                setPaymentAmount("");
              }}
              className={`flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl border-2 transition-all ${
                paymentMethod === "card"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-600 dark:text-slate-400"
              }`}
            >
              <CreditCard size={18} />
              <span className="font-semibold text-sm sm:text-base">Card</span>
            </button>
          </div>
        </div>

        {/* Payment Amount (for cash) */}
        {paymentMethod === "cash" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Amount Tendered
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base sm:text-lg">
                R
              </span>
              <input
                type="number"
                step="0.01"
                min={cartTotal}
                placeholder={cartTotal.toFixed(2)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-lg sm:text-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            {/* Quick amount buttons */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                Math.ceil(cartTotal / 10) * 10,
                Math.ceil(cartTotal / 50) * 50,
                Math.ceil(cartTotal / 100) * 100,
              ]
                .filter((v, i, a) => a.indexOf(v) === i && v >= cartTotal)
                .slice(0, 3)
                .map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setPaymentAmount(amount.toString())}
                    className="py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    R {amount}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Total & Change */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {t("sell.total")} ({cartItemCount} items)
            </span>
            <span className="text-xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              R {cartTotal.toFixed(2)}
            </span>
          </div>

          {paymentMethod === "cash" && paymentAmountNum > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Tendered
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  R {paymentAmountNum.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Change
                </span>
                <span
                  className={`text-xl sm:text-2xl font-bold ${
                    change >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  R {change.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            className="w-full h-14 text-lg"
            size="lg"
            onClick={handleSell}
            disabled={isSubmitting || !canCompleteSale}
          >
            <ShoppingCart size={24} />
            {isSubmitting ? "Processing..." : t("sell.complete_sale")}
          </Button>

          {paymentMethod === "cash" && !canCompleteSale && paymentAmount && (
            <p className="text-xs text-red-500 text-center">
              Amount must be at least R {cartTotal.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    );
  }
}
