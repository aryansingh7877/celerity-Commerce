import React, { useCallback, useEffect, useState } from 'react';
import { Product, MerchantTab, StoreLocation } from '../../types/product';
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
  DeadStockPage,
  NotificationsPage,
  OrdersAdminPage,
  RestockPage,
  SuppliersPage,
} from './pages/AdminOpsPages';
import { AddProductModal } from './dashboard/AddProductModal';
import { EditProductModal } from './dashboard/EditProductModal';
import { DeleteConfirmation } from './dashboard/DeleteConfirmation';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  adjustAdminStock,
  clearAdminCatalog,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
} from '../../lib/commerceApi';
import { api } from '../../lib/api';

interface MerchantDashboardProps {
  onExitToStorefront: () => void;
  onSignOut: () => void;
  merchantName?: string;
  merchantEmail?: string;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  onExitToStorefront,
  onSignOut,
  merchantName = 'Merchant',
  merchantEmail = '',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentTab, setCurrentTab] = useState<MerchantTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<StoreLocation>('All Locations');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPreferBulk, setAddModalPreferBulk] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchAdminProducts();
      setProducts(rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load inventory from API');
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Keep admin stock in sync with customer checkouts / other tabs
    const id = setInterval(() => {
      void refresh();
    }, 10_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const handleAdjustStock = async (productId: string, delta: number) => {
    const row = products.find((p) => p.id === productId);
    if (!row) return;
    const newStock = Math.max(0, row.stock + delta);
    try {
      await adjustAdminStock(productId, row.location, newStock);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Stock update failed');
    }
  };

  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) => {
    try {
      await createAdminProduct(newProd);
      await refresh();
      showToast(`Added "${newProd.name}" to Aiven inventory.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const openAddModal = (preferBulk = products.length === 0) => {
    setAddModalPreferBulk(preferBulk);
    setIsAddModalOpen(true);
  };

  const handleAddBulkProducts = async (
    newProds: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>[]
  ) => {
    try {
      for (const p of newProds) {
        // Skip giant data-URLs that blow up the API — keep http(s) / category defaults
        const image =
          p.image && p.image.startsWith('data:') && p.image.length > 200_000
            ? 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80'
            : p.image;
        await createAdminProduct({ ...p, image });
      }
      try {
        await api('/api/admin/reindex', { method: 'POST' });
      } catch {
        /* search will fall back to Postgres */
      }
      await refresh();
      setCurrentTab('overview');
      setIsAddModalOpen(false);
      showToast(`Imported ${newProds.length} products — now live in Customer View.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk import failed');
    }
  };

  const handleClearCatalog = async () => {
    if (
      !window.confirm(
        'Clear the entire catalog? Products will be hidden from customers and merchant inventory.'
      )
    ) {
      return;
    }
    try {
      const result = await clearAdminCatalog();
      await refresh();
      showToast(`Cleared ${result.cleared} products from catalog.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to clear catalog');
    }
  };

  const handleOpenEdit = (product: Product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (updated: Product) => {
    try {
      await updateAdminProduct(updated);
      await refresh();
      showToast(`Updated "${updated.name}".`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleOpenDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteAdminProduct(productToDelete.id);
      await refresh();
      showToast(`Removed "${productToDelete.name}".`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  const lowStockCount = products.filter((p) => p.stock >= 1 && p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#202A24] flex font-sans selection:bg-[#DCEFE3] selection:text-[#064E36]">
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

      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
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
          merchantName={merchantName}
          merchantEmail={merchantEmail}
        />

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
              onEditProduct={handleOpenEdit}
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
          {currentTab === 'deadstock' && <DeadStockPage />}
          {currentTab === 'suppliers' && <SuppliersPage />}
          {currentTab === 'restock' && <RestockPage />}
          {currentTab === 'notifications' && <NotificationsPage />}
          {currentTab === 'settings' && (
            <SettingsPage merchantName={merchantName} merchantEmail={merchantEmail} />
          )}
        </main>
      </div>

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
    </div>
  );
};
