const { contextBridge, ipcRenderer } = require('electron');

<<<<<<< HEAD
contextBridge.exposeInMainWorld('electronAPI', {
    // API เดิม
=======
// เปิด API ทั้งหมดให้ renderer process ใช้ได้
contextBridge.exposeInMainWorld('electronAPI', {
    checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
>>>>>>> a6ffa4fc6e1fed32c770c0ef139e43a76ce05547
    saveProduct: (product) => ipcRenderer.invoke('save-product', product),
    getProducts: () => ipcRenderer.invoke('get-products'),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    getCategories: () => ipcRenderer.invoke('get-categories'),
<<<<<<< HEAD
    
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
=======
    onOnlineStatusChange: (callback) => {
        const handleStatusChange = async () => {
            const status = await ipcRenderer.invoke('check-online-status');
            callback(status);
        };
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
    }
});
>>>>>>> a6ffa4fc6e1fed32c770c0ef139e43a76ce05547
