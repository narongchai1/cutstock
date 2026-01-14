const { contextBridge, ipcRenderer } = require('electron');

// เปิด API ทั้งหมดให้ renderer process ใช้ได้
contextBridge.exposeInMainWorld('electronAPI', {
    checkOnlineStatus: () => ipcRenderer.invoke('check-online-status'),
    saveProduct: (product) => ipcRenderer.invoke('save-product', product),
    getProducts: () => ipcRenderer.invoke('get-products'),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    getCategories: () => ipcRenderer.invoke('get-categories'),
    onOnlineStatusChange: (callback) => {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    }
});