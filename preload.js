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
    getSalesReport: (startDate, endDate, shift_id) => ipcRenderer.invoke('get-sales-report', startDate, endDate, shift_id),
    getTopProducts: (limit, startDate, endDate) => ipcRenderer.invoke('get-top-products', limit, startDate, endDate),
    
    // Config API
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    
    // Backup API
    getBackupFiles: () => ipcRenderer.invoke('get-backup-files'),
    restoreBackup: (backupFile) => ipcRenderer.invoke('restore-backup', backupFile),
    createBackup: () => ipcRenderer.invoke('create-backup'),
    
    // Utility API
    showDialog: (options) => ipcRenderer.invoke('show-dialog', options),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // Event listeners
    onOnlineStatusChange: (callback) => {
        // ตรวจสอบสถานะทุกๆ 30 วินาที
        const checkStatus = async () => {
            try {
                const status = await ipcRenderer.invoke('check-online-status');
                callback(status);
            } catch (error) {
                console.error('Error checking online status:', error);
                callback(false);
            }
        };
        
        // เรียกครั้งแรก
        checkStatus();
        
        // ตั้งเวลาเรียกซ้ำ
        const interval = setInterval(checkStatus, 30000);
        
        // ฟัง events จาก network
        const onlineHandler = () => checkStatus();
        const offlineHandler = () => callback(false);
        
        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);
        
        // คืนค่า function สำหรับยกเลิก
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', onlineHandler);
            window.removeEventListener('offline', offlineHandler);
        };
    },
    
    // Version info
    getAppVersion: () => {
        return process.env.npm_package_version || '1.0.0';
    },
    
    // Platform info
    getPlatform: () => {
        return process.platform;
    }
});

// เพิ่ม safe logging
console.log('✅ Preload script loaded');
console.log('📦 Electron version:', process.versions.electron);
console.log('🖥️ Platform:', process.platform);