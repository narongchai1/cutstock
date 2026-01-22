const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // API เดิม
    saveProduct: (product) => ipcRenderer.invoke('save-product', product),
    getProducts: () => ipcRenderer.invoke('get-products'),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    getCategories: () => ipcRenderer.invoke('get-categories'),
    
    // API สำหรับ Reports
    checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
    getProductsForReport: (startDate, endDate) => ipcRenderer.invoke('get-products-for-report', startDate, endDate),
    getReportStats: (startDate, endDate) => ipcRenderer.invoke('get-report-stats', startDate, endDate),
    exportReportExcel: () => ipcRenderer.invoke('export-report-excel'),
    
    // สำหรับฟังสถานะเครือข่าย
    onOnlineStatusChange: (callback) => {
        ipcRenderer.send('listen-online-status');
        ipcRenderer.on('online-status-changed', (event, isOnline) => callback(isOnline));
    },
    
    // ฟังก์ชันเพื่อยกเลิก listener ถ้าต้องการ
    removeOnlineStatusListener: () => {
        ipcRenderer.removeAllListeners('online-status-changed');
    }
});