import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Product, MerchantTab, StoreLocation, PaymentDiscountOffer } from '../../types/product';
import {
  loadCatalog,
  saveCatalog,
  clearCatalog,
  setActiveMerchantScope,
} from '../../lib/merchantInventoryStore';
import {
  adjustAdminStock,
  clearAdminCatalog,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
} from '../../lib/commerceApi';
import { api } from '../../lib/api';
import { MerchantSidebar } from './layout/MerchantSidebar';
import { MerchantTopbar } from './layout/MerchantTopbar';
import { OverviewPage } from './pages/Overview';
import { InventoryPage } from './pages/Inventory';
import { ProductsPage } from './pages/Products';
import { CategoriesPage } from './pages/Categories';
import { StockManagementPage } from './pages/StockManagement';
import { StoreLocationsPage } from './pages/StoreLocations';
import { SettingsPage } from './pages/Settings';
import {
  OrdersAdminPage,
  DeadStockPage,
  SuppliersPage,
  RestockPage,
  NotificationsPage,
} from './pages/AdminOpsPages';
import { AddProductModal } from './dashboard/AddProductModal';
import { EditProductModal } from './dashboard/EditProductModal';
import { DeleteConfirmation } from './dashboard/DeleteConfirmation';
import { SupplierContactModal } from './dashboard/SupplierContactModal';
import {
  DeadStockSolutionsModal,
  PaymentDiscountModal,
} from './dashboard/InventoryActionModals';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MerchantDashboardProps {
  onExitToStorefront: () => void;
  onSignOut: () => void;
  merchantName?: string;
  merchantEmail?: string;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  onExitToStorefront,
  onSignOut,
  merchantName = 'Aryan Singh',
  merchantEmail = 'aryansingh787769@gmail.com',
}) => {
  // ── 1. Core State — hydrate from saved catalog scoped to this merchant (empty until first upload) ──
  const merchantScope = (merchantEmail || merchantName || 'anonymous').trim().toLowerCase();
  const [products, setProducts] = useState<Product[]>(() => loadCatalog(merchantScope));
  const [currentTab, setCurrentTab] = useState<MerchantTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<StoreLocation>('All Locations');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    setActiveMerchantScope(merchantScope);
    skipFirstSave.current = true;
    setProducts(loadCatalog(merchantScope));
  }, [merchantScope]);

  // ── 2. Modals State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPreferBulk, setAddModalPreferBulk] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Supplier Outreach, Dead Stock Solutions & Payment Discount Modals
  const [supplierModalProduct, setSupplierModalProduct] = useState<Product | null>(null);
  const [deadStockModalProduct, setDeadStockModalProduct] = useState<Product | null>(null);
  const [paymentModalProduct, setPaymentModalProduct] = useState<Product | null>(null);

  // ── 3. Notification Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync from Express Admin API if reachable + keep localStorage persisted
  const [apiConnected, setApiConnected] = useState(false);

  const refreshFromApi = useCallback(async () => {
    try {
      const apiRows = await fetchAdminProducts();
      setApiConnected(true);
      if (apiRows.length > 0) {
        setProducts((prev) => {
          // Do not prefill a brand-new merchant's empty catalog with shared DB products from other accounts
          if (prev.length === 0) return prev;
          // Only sync SKUs that belong to this merchant's local catalog
          const localBySku = new Map(prev.map((p) => [p.sku.toUpperCase(), p]));
          const synced = apiRows
            .filter((row) => localBySku.has(row.sku.toUpperCase()))
            .map((row) => {
              const match = localBySku.get(row.sku.toUpperCase())!;
              return {
                ...row,
                images: match.images || row.images,
                paymentOffers: match.paymentOffers,
                supplierName: match.supplierName || row.supplierName,
                supplierPhone: match.supplierPhone || row.supplierPhone,
              };
            });
          return synced.length > 0 ? synced : prev;
        });
      }
    } catch {
      setApiConnected(false);
    }
  }, []);

  useEffect(() => {
    void refreshFromApi();
    const id = setInterval(() => void refreshFromApi(), 10_000);
    const onFocus = () => void refreshFromApi();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshFromApi]);

  // Persist inventory after every change (upload, edit, stock, delete)
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const result = saveCatalog(products, merchantScope);
    if (!result.ok && result.error) {
      showToast(result.error);
    }
  }, [products, merchantScope]);

  // ── 4. Stock Adjustments (Prevent Negative Quantities) ──
  const handleAdjustStock = async (productId: string, delta: number) => {
    const row = products.find((p) => p.id === productId);
    const newStock = row ? Math.max(0, row.stock + delta) : 0;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            stock: Math.max(0, p.stock + delta),
            lastUpdated: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    if (apiConnected && row) {
      try {
        await adjustAdminStock(productId, row.location, newStock);
      } catch {
        /* local state already updated */
      }
    }
  };

  // ── 5. Add Single Product ──
  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setProducts((prev) => [created, ...prev]);

    if (apiConnected) {
      try {
        await createAdminProduct(newProd);
        await refreshFromApi();
        showToast(`Added "${created.name}" to Aiven & local inventory.`);
        return;
      } catch {
        /* fallback to local toast */
      }
    }
    showToast(`Added "${created.name}" to inventory.`);
  };

  const openAddModal = (preferBulk = products.length === 0) => {
    setAddModalPreferBulk(preferBulk);
    setIsAddModalOpen(true);
  };

  // ── 5b. Bulk import replaces or upserts by SKU cleanly into catalog ──
  const handleAddBulkProducts = async (
    newProds: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>[],
    replaceExisting = true
  ) => {
    const now = new Date().toISOString();
    const createdList: Product[] = newProds.map((item, idx) => ({
      ...item,
      id: `prod-${Date.now().toString(36)}-${idx}`,
      createdAt: now,
      lastUpdated: now,
    }));
    setProducts((prev) => {
      if (replaceExisting || prev.length === 0) return createdList;
      const incomingSkus = new Set(createdList.map((p) => p.sku.toUpperCase()));
      const kept = prev.filter((p) => !incomingSkus.has(p.sku.toUpperCase()));
      return [...createdList, ...kept];
    });
    setCurrentTab('inventory');
    setIsAddModalOpen(false);

    if (apiConnected) {
      try {
        for (const p of newProds) {
          const image =
            p.image && p.image.startsWith('data:') && p.image.length > 200_000
              ? 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80'
              : p.image;
          await createAdminProduct({ ...p, image });
        }
        await api('/api/admin/reindex', { method: 'POST' }).catch(() => undefined);
        await refreshFromApi();
      } catch {
        /* local catalog already updated */
      }
    }
    showToast(`Imported ${createdList.length} classified SKUs to inventory.`);
  };

  const handleClearCatalog = async () => {
    clearCatalog(merchantScope);
    setProducts([]);
    if (apiConnected) {
      await clearAdminCatalog().catch(() => undefined);
    }
    showToast('Cleared catalog inventory.');
  };

  // ── 6. Edit Product ──
  const handleOpenEdit = (product: Product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (apiConnected) {
      await updateAdminProduct(updated).catch(() => undefined);
    }
    showToast(`Updated "${updated.name}" details.`);
  };

  // ── 7. Delete Product ──
  const handleOpenDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      const target = productToDelete;
      setProducts((prev) => prev.filter((p) => p.id !== target.id));
      if (apiConnected) {
        await deleteAdminProduct(target.id).catch(() => undefined);
      }
      showToast(`Removed "${target.name}" from catalog.`);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  // Dynamic alert counts & low/zero stock product list for Topbar notifications
  const lowStockCount = products.filter((p) => p.stock >= 1 && p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const alertProducts = products.filter((p) => p.stock <= 10);

  const handleSaveSupplierInfo = (
    productId: string,
    supplierName: string,
    supplierPhone: string
  ) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, supplierName, supplierPhone, lastUpdated: new Date().toISOString() }
          : p
      )
    );
  };

  const handleSavePaymentOffers = (
    productId: string,
    offers: PaymentDiscountOffer[]
  ) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, paymentOffers: offers, lastUpdated: new Date().toISOString() }
          : p
      )
    );
    setPaymentModalProduct((prev) =>
      prev && prev.id === productId ? { ...prev, paymentOffers: offers } : prev
    );
    showToast('Updated payment method discounts for SKU.');
  };

  const handleApplyDeadStockMarkdown = (product: Product, discountPct: number) => {
    const newPrice = Math.max(100, Math.round((product.price * (100 - discountPct)) / 100));
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? { ...p, price: newPrice, lastUpdated: new Date().toISOString() }
          : p
      )
    );
    showToast(`Applied ${discountPct}% clearance markdown on "${product.name}".`);
  };

  const handleRebalanceDeadStock = (product: Product, targetStock: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? { ...p, stock: targetStock, lastUpdated: new Date().toISOString() }
          : p
      )
    );
    showToast(`Transferred excess units of "${product.name}" to partner city hubs.`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#202A24] flex font-sans selection:bg-[#DCEFE3] selection:text-[#064E36]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#064E36] text-white shadow-xl flex items-center gap-2 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-[#C8E8D9]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed Left Sidebar ── */}
      <MerchantSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onExitToStorefront={onExitToStorefront}
        onSignOut={onSignOut}
        merchantName={merchantName}
        merchantEmail={merchantEmail}
        lowStockCount={lowStockCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* ── Main Content Area (Offset by Sidebar on Desktop) ── */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <MerchantTopbar
          currentTab={currentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onExitToStorefront={onExitToStorefront}
          onSignOut={onSignOut}
          lowStockCount={lowStockCount}
          outOfStockCount={outOfStockCount}
          alertProducts={alertProducts}
          onInformSupplier={(prod) => setSupplierModalProduct(prod)}
          onTakeAction={(prod) => {
            setSearchQuery(prod.sku);
            setCurrentTab('inventory');
          }}
          merchantName={merchantName}
          merchantEmail={merchantEmail}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewPage
              products={products}
              onOpenAddProduct={() => openAddModal(true)}
              onNavigateTab={setCurrentTab}
              onEditProduct={handleOpenEdit}
              onDeleteProduct={handleOpenDelete}
              onAdjustStock={handleAdjustStock}
              merchantName={merchantName}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryPage
              products={products}
              onOpenAddProduct={() => openAddModal(true)}
              onEditProduct={handleOpenEdit}
              onDeleteProduct={handleOpenDelete}
              onAdjustStock={handleAdjustStock}
              onInformSupplier={(prod) => setSupplierModalProduct(prod)}
              onSuggestDeadStockSolutions={(prod) => setDeadStockModalProduct(prod)}
              onOpenPaymentDiscounts={(prod) => setPaymentModalProduct(prod)}
              onClearCatalog={handleClearCatalog}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
            />
          )}

          {currentTab === 'products' && (
            <ProductsPage
              products={products}
              onOpenAddProduct={() => openAddModal(products.length === 0)}
              onEditProduct={handleOpenEdit}
              onDeleteProduct={handleOpenDelete}
              onAdjustStock={handleAdjustStock}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedLocation={selectedLocation}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesPage
              products={products}
              onNavigateToInventoryWithCategory={(cat) => {
                setSearchQuery(cat);
                setCurrentTab('inventory');
              }}
              onEditProduct={handleOpenEdit}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {currentTab === 'stock' && (
            <StockManagementPage
              products={products}
              onAdjustStock={handleAdjustStock}
              onInformSupplier={(prod) => setSupplierModalProduct(prod)}
              onSuggestDeadStockSolutions={(prod) => setDeadStockModalProduct(prod)}
              onNavigateTab={setCurrentTab}
              merchantName={merchantName}
            />
          )}

          {currentTab === 'locations' && (
            <StoreLocationsPage
              products={products}
              onSelectLocationFilter={(loc) => {
                setSelectedLocation(loc);
                setCurrentTab('inventory');
              }}
            />
          )}

          {currentTab === 'orders' && <OrdersAdminPage />}
          {currentTab === 'deadstock' && (
            <DeadStockPage
              products={products}
              onSuggestSolutions={(prod) => setDeadStockModalProduct(prod)}
              onOpenPaymentDiscounts={(prod) => setPaymentModalProduct(prod)}
            />
          )}
          {currentTab === 'suppliers' && <SuppliersPage />}
          {currentTab === 'restock' && <RestockPage />}
          {currentTab === 'notifications' && <NotificationsPage />}

          {currentTab === 'settings' && (
            <SettingsPage
              merchantName={merchantName}
              merchantEmail={merchantEmail}
              products={products}
            />
          )}
        </main>
      </div>

      {/* ── Global Modals ── */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProduct}
        onAddBulkProducts={handleAddBulkProducts}
        preferBulkMode={addModalPreferBulk}
      />

      <EditProductModal
        product={productToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setProductToEdit(null);
        }}
        onUpdateProduct={handleUpdateProduct}
      />

      <DeleteConfirmation
        product={productToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <SupplierContactModal
        product={supplierModalProduct}
        isOpen={!!supplierModalProduct}
        onClose={() => setSupplierModalProduct(null)}
        onSaveSupplierInfo={handleSaveSupplierInfo}
      />

      <DeadStockSolutionsModal
        product={deadStockModalProduct}
        isOpen={!!deadStockModalProduct}
        onClose={() => setDeadStockModalProduct(null)}
        onApplyMarkdown={handleApplyDeadStockMarkdown}
        onRebalanceStock={handleRebalanceDeadStock}
        onOpenPaymentDiscounts={(prod) => setPaymentModalProduct(prod)}
      />

      <PaymentDiscountModal
        product={paymentModalProduct}
        isOpen={!!paymentModalProduct}
        onClose={() => setPaymentModalProduct(null)}
        onSavePaymentOffers={handleSavePaymentOffers}
      />
    </div>
  );
};
