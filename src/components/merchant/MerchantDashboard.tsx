import React, { useEffect, useRef, useState } from 'react';
import { Product, MerchantTab, StoreLocation } from '../../types/product';
import { loadCatalog, saveCatalog } from '../../lib/merchantInventoryStore';
import { MerchantSidebar } from './layout/MerchantSidebar';
import { MerchantTopbar } from './layout/MerchantTopbar';
import { OverviewPage } from './pages/Overview';
import { InventoryPage } from './pages/Inventory';
import { ProductsPage } from './pages/Products';
import { CategoriesPage } from './pages/Categories';
import { StockManagementPage } from './pages/StockManagement';
import { StoreLocationsPage } from './pages/StoreLocations';
import { SettingsPage } from './pages/Settings';
import { AddProductModal } from './dashboard/AddProductModal';
import { EditProductModal } from './dashboard/EditProductModal';
import { DeleteConfirmation } from './dashboard/DeleteConfirmation';
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
  // ── 1. Core State — hydrate from saved catalog (empty until first upload) ──
  const [products, setProducts] = useState<Product[]>(() => loadCatalog());
  const [currentTab, setCurrentTab] = useState<MerchantTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<StoreLocation>('All Locations');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const skipFirstSave = useRef(true);

  // ── 2. Modals State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPreferBulk, setAddModalPreferBulk] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // ── 3. Notification Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist inventory after every change (upload, edit, stock, delete)
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const result = saveCatalog(products);
    if (!result.ok && result.error) {
      showToast(result.error);
    }
  }, [products]);

  // ── 4. Stock Adjustments (Prevent Negative Quantities) ──
  const handleAdjustStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock + delta);
          return {
            ...p,
            stock: newStock,
            lastUpdated: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  // ── 5. Add Single Product ──
  const handleAddProduct = (newProd: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setProducts((prev) => [created, ...prev]);
    showToast(`Added "${created.name}" to inventory.`);
  };

  const openAddModal = (preferBulk = products.length === 0) => {
    setAddModalPreferBulk(preferBulk);
    setIsAddModalOpen(true);
  };

  // ── 5b. Bulk import replaces empty catalog / merges into existing ──
  const handleAddBulkProducts = (newProds: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>[]) => {
    const createdList: Product[] = newProds.map((item, idx) => ({
      ...item,
      id: `prod-${Date.now().toString(36)}-${idx}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }));
    setProducts((prev) => (prev.length === 0 ? createdList : [...createdList, ...prev]));
    setCurrentTab('overview');
    setIsAddModalOpen(false);
    showToast(`Saved ${createdList.length} products — reload will keep this catalog.`);
  };

  // ── 6. Edit Product ──
  const handleOpenEdit = (product: Product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast(`Updated "${updated.name}" details.`);
  };

  // ── 7. Delete Product ──
  const handleOpenDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      showToast(`Removed "${productToDelete.name}" from catalog.`);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  // Dynamic alert counts
  const lowStockCount = products.filter((p) => p.stock >= 1 && p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

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
              onOpenAddProduct={() => openAddModal(products.length === 0)}
              onEditProduct={handleOpenEdit}
              onDeleteProduct={handleOpenDelete}
              onAdjustStock={handleAdjustStock}
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

          {currentTab === 'settings' && (
            <SettingsPage
              merchantName={merchantName}
              merchantEmail={merchantEmail}
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
    </div>
  );
};
