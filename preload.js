const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // API เดิม
    checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
    saveProduct: (product) => ipcRenderer.invoke('save-product', product),
    getProducts: (searchTerm = '') => ipcRenderer.invoke('get-products', searchTerm),
    getProduct: (id) => ipcRenderer.invoke('get-product', id),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    getCategories: () => ipcRenderer.invoke('get-categories'),
    getStatistics: () => ipcRenderer.invoke('get-statistics'),
    searchProducts: (term) => ipcRenderer.invoke('search-products', term),
    
    // Config API
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    
    // Backup API
    getBackupFiles: () => ipcRenderer.invoke('get-backup-files'),
    restoreBackup: (backupFile) => ipcRenderer.invoke('restore-backup', backupFile),
    
    onOnlineStatusChange: (callback) => {
        const handleStatusChange = async () => {
            const status = await ipcRenderer.invoke('check-online-status');
            callback(status);
        };
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
    }
});
