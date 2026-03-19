// preload.js - ฉบับแก้ไข
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Network API
    checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
    
    // Database Check API
    checkDatabase: () => ipcRenderer.invoke('check-database'),
    checkStockPage: () => ipcRenderer.invoke('check-stock-page'),
    
    // Product API
    saveProduct: (product) => ipcRenderer.invoke('save-product', product),
    getProducts: (searchTerm = '') => ipcRenderer.invoke('get-products', searchTerm),
    getProduct: (id) => ipcRenderer.invoke('get-product', id),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    searchProducts: (term) => ipcRenderer.invoke('search-products', term),
    
    // Product Lots API
    addProductLot: (lotData) => ipcRenderer.invoke('add-product-lot', lotData),
    getProductLots: (productId) => ipcRenderer.invoke('get-product-lots', productId),
    updateProductLot: (lotId, lotData) => ipcRenderer.invoke('update-product-lot', lotId, lotData),
    deleteProductLot: (lotId) => ipcRenderer.invoke('delete-product-lot', lotId),
    
    // Supplier API
    getAllSuppliers: () => ipcRenderer.invoke('get-all-suppliers'),
    getSupplier: (code) => ipcRenderer.invoke('get-supplier', code),
    createSupplier: (supplierData) => ipcRenderer.invoke('create-supplier', supplierData),
    updateSupplier: (code, supplierData) => ipcRenderer.invoke('update-supplier', code, supplierData),
    deleteSupplier: (code) => ipcRenderer.invoke('delete-supplier', code),
    
    // Authentication API
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    
    // Shift API
    openShift: (shiftData) => ipcRenderer.invoke('open-shift', shiftData),
    getCurrentShift: (cashier_id) => ipcRenderer.invoke('get-current-shift', cashier_id),
    getShiftById: (shift_id) => ipcRenderer.invoke('get-shift-by-id', shift_id),
    getShiftSales: (shift_id) => ipcRenderer.invoke('get-shift-sales', shift_id),
    closeShift: (shift_id, closingData) => ipcRenderer.invoke('close-shift', shift_id, closingData),
    
    // Category API
    getCategories: () => ipcRenderer.invoke('get-categories'),
    
    // Statistics API
    getStatistics: () => ipcRenderer.invoke('get-statistics'),
    
    // Sales API
    saveSale: (saleData) => ipcRenderer.invoke('save-sale', saleData),
    getSalesHistory: (limit, shift_id) => ipcRenderer.invoke('get-sales-history', limit, shift_id),
    
    // Report API
    getClosedShifts: (startDate, endDate) => ipcRenderer.invoke('get-closed-shifts', startDate, endDate),
    getSalesByDateRange: (startDate, endDate) => ipcRenderer.invoke('get-sales-by-date-range', startDate, endDate),
    getShiftSalesWithItems: (shiftId) => ipcRenderer.invoke('get-shift-sales-with-items', shiftId),
    getDailySalesSummary: (startDate, endDate) => ipcRenderer.invoke('get-daily-sales-summary', startDate, endDate),
    getTopProducts: (startDate, endDate, limit = 10) => ipcRenderer.invoke('get-top-products', startDate, endDate, limit),
    getSalesByCashier: (startDate, endDate) => ipcRenderer.invoke('get-sales-by-cashier', startDate, endDate),
    getMonthlySales: (year) => ipcRenderer.invoke('get-monthly-sales', year),
    getShiftClosingDetails: (startDate, endDate) => ipcRenderer.invoke('get-shift-closing-details', startDate, endDate),
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    getHourlySalesToday: () => ipcRenderer.invoke('get-hourly-sales-today'),
    
    // Config API
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    
    // Backup API
    getBackupFiles: () => ipcRenderer.invoke('get-backup-files'),
    restoreBackup: (backupFile) => ipcRenderer.invoke('restore-backup', backupFile),
    createBackup: () => ipcRenderer.invoke('create-backup'),
    
    // Version info
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

console.log('✅ Preload script loaded');