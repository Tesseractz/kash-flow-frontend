import { loadFromStorage, saveToStorage } from "./offlineStorage";

export const OFFLINE_SALES_KEY = "kashflow_offline_sales_v1";
export const PRODUCT_CACHE_KEY = "kashflow_product_cache_v1";
export const PRODUCT_OPS_KEY = "kashflow_product_ops_v1";
export const PRODUCT_ID_MAP_KEY = "kashflow_product_id_map_v1";

const getIdMap = () => loadFromStorage(PRODUCT_ID_MAP_KEY, {});
const setIdMap = (map) => saveToStorage(PRODUCT_ID_MAP_KEY, map);

export const getProductOps = () => loadFromStorage(PRODUCT_OPS_KEY, []);
export const setProductOps = (ops) => saveToStorage(PRODUCT_OPS_KEY, ops);

export const getCachedProducts = () =>
  loadFromStorage(PRODUCT_CACHE_KEY, []);
export const setCachedProducts = (products) =>
  saveToStorage(PRODUCT_CACHE_KEY, products);

export const getOfflineSales = () => loadFromStorage(OFFLINE_SALES_KEY, []);
export const setOfflineSales = (sales) =>
  saveToStorage(OFFLINE_SALES_KEY, sales);

const applyIdMap = (productId, idMap) => {
  if (typeof productId === "string" && productId.startsWith("temp-")) {
    return idMap[productId] || null;
  }
  return productId;
};

export const syncProductOps = async (ProductsAPI) => {
  const opsQueue = getProductOps();
  if (!opsQueue.length) return { synced: 0, remaining: [], idMap: getIdMap() };

  const cache = getCachedProducts();
  const idMap = { ...getIdMap() };
  const remaining = [];
  let synced = 0;

  for (const op of opsQueue) {
    try {
      if (op.type === "create") {
        const created = await ProductsAPI.create(op.data);
        idMap[op.tempId] = created.id;
        const nextCache = cache.map((p) =>
          p.id === op.tempId ? { ...created } : p
        );
        cache.splice(0, cache.length, ...nextCache);
        synced += 1;
      } else if (op.type === "update") {
        const realId = applyIdMap(op.id, idMap);
        if (!realId) {
          remaining.push(op);
          continue;
        }
        await ProductsAPI.update(realId, op.data);
        synced += 1;
      } else if (op.type === "delete") {
        const realId = applyIdMap(op.id, idMap);
        if (!realId) {
          remaining.push(op);
          continue;
        }
        await ProductsAPI.remove(realId);
        synced += 1;
      }
    } catch (e) {
      remaining.push(op);
    }
  }

  setIdMap(idMap);
  setProductOps(remaining);
  setCachedProducts(cache);

  return { synced, remaining, idMap };
};

export const syncOfflineSales = async (SalesAPI) => {
  const salesQueue = getOfflineSales();
  if (!salesQueue.length) return { synced: 0, remaining: [] };

  const idMap = getIdMap();
  const remaining = [];
  let synced = 0;

  for (const sale of salesQueue) {
    const mappedItems = sale.items.map((item) => ({
      ...item,
      product_id: applyIdMap(item.product_id, idMap),
    }));

    if (mappedItems.some((item) => !item.product_id)) {
      remaining.push(sale);
      continue;
    }

    try {
      await Promise.all(
        mappedItems.map((item) =>
          SalesAPI.create({
            product_id: item.product_id,
            quantity_sold: item.quantity,
          })
        )
      );
      synced += 1;
    } catch (e) {
      remaining.push(sale);
    }
  }

  setOfflineSales(remaining);
  return { synced, remaining };
};

export const syncAllOffline = async ({ ProductsAPI, SalesAPI }) => {
  const productResult = ProductsAPI
    ? await syncProductOps(ProductsAPI)
    : { synced: 0, remaining: [] };
  const salesResult = SalesAPI
    ? await syncOfflineSales(SalesAPI)
    : { synced: 0, remaining: [] };
  return {
    productsSynced: productResult.synced,
    salesSynced: salesResult.synced,
    remainingSales: salesResult.remaining?.length || 0,
    remainingOps: productResult.remaining?.length || 0,
  };
};

