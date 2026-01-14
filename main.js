const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// สร้างโฟลเดอร์ข้อมูล
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'src/assets/icons/app-icon.png')
    });

    // โหลดหน้า Login
    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    // เปิด DevTools สำหรับการพัฒนา
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
const database = require('./src/js/database');

ipcMain.handle('check-online-status', () => {
    return require('electron').net.isOnline();
});

ipcMain.handle('save-product', async (event, product) => {
    return await database.saveProduct(product);
});

ipcMain.handle('get-products', async () => {
    return await database.getProducts();
});

ipcMain.handle('delete-product', async (event, id) => {
    return await database.deleteProduct(id);
});

ipcMain.handle('login', async (event, credentials) => {
    return await database.authenticate(credentials.username, credentials.password);
});

ipcMain.handle('get-categories', async () => {
    return await database.getCategories();
});