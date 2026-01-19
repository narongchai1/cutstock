const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');

// สร้างโฟลเดอร์ข้อมูล
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let mainWindow;

const configPath = path.join(__dirname, 'config.json');
let appConfig = {};
if (fs.existsSync(configPath)) {
    try {
        appConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.warn('Invalid config.json:', error);
    }
}

const backendUrlRaw = process.env.BACKEND_URL || appConfig.backendUrl || 'http://127.0.0.1:8000';
const backendUrl = backendUrlRaw.replace(/\/+$/, '');
const apiTimeoutMs = Number(appConfig.apiTimeoutMs) || 5000;
const healthCheckTtlMs = Number(appConfig.healthCheckTtlMs) || 3000;
const internetCheckUrl = appConfig.internetCheckUrl || 'https://1.1.1.1/cdn-cgi/trace';
const internetCheckTimeoutMs = Number(appConfig.internetCheckTimeoutMs) || 2500;
const requireInternetForOnlineStatus = appConfig.requireInternetForOnlineStatus !== false;

let lastHealthCheckAt = 0;
let lastHealthStatus = false;
let lastInternetCheckAt = 0;
let lastInternetStatus = false;

async function safeReadJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function apiRequest(pathname, options = {}) {
    const pathPart = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const url = `${backendUrl}${pathPart}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), apiTimeoutMs);
    const headers = {
        Accept: 'application/json',
        ...(options.headers || {}),
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
        const data = await safeReadJson(response);
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, error };
    } finally {
        clearTimeout(timeout);
    }
}

async function apiRequestAbsolute(url, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs) || apiTimeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const headers = {
        Accept: 'application/json',
        ...(options.headers || {}),
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
        const data = await safeReadJson(response);
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, error };
    } finally {
        clearTimeout(timeout);
    }
}

async function isInternetOnline() {
    if (!net.isOnline()) {
        return false;
    }

    const now = Date.now();
    if (now - lastInternetCheckAt < healthCheckTtlMs) {
        return lastInternetStatus;
    }

    if (!internetCheckUrl) {
        lastInternetCheckAt = now;
        lastInternetStatus = true;
        return true;
    }

    const result = await apiRequestAbsolute(internetCheckUrl, {
        method: 'HEAD',
        timeoutMs: internetCheckTimeoutMs,
    });
    lastInternetCheckAt = now;
    lastInternetStatus = result.ok;
    return lastInternetStatus;
}

async function isBackendOnline() {
    if (requireInternetForOnlineStatus) {
        const internetOk = await isInternetOnline();
        if (!internetOk) {
            return false;
        }
    } else if (!net.isOnline()) {
        return false;
    }

    const now = Date.now();
    if (now - lastHealthCheckAt < healthCheckTtlMs) {
        return lastHealthStatus;
    }

    const result = await apiRequest('/api/health');
    lastHealthCheckAt = now;
    lastHealthStatus = result.ok;
    return lastHealthStatus;
}

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

ipcMain.handle('check-online-status', async () => {
    return await isBackendOnline();
});

ipcMain.handle('save-product', async (event, product) => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest('/api/products', {
            method: 'POST',
            body: JSON.stringify(product),
        });
        if (result.ok && result.data && result.data.success) {
            await database.saveProduct(result.data.product || product);
            return result.data;
        }
    }

    return await database.saveProduct(product);
});

ipcMain.handle('get-products', async () => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest('/api/products');
        if (result.ok && Array.isArray(result.data)) {
            return result.data;
        }
    }

    return await database.getProducts();
});

ipcMain.handle('delete-product', async (event, id) => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
        if (result.ok && result.data && result.data.success) {
            await database.deleteProduct(id);
            return result.data;
        }
    }

    return await database.deleteProduct(id);
});

ipcMain.handle('login', async (event, credentials) => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        if (result.data) {
            return result.data;
        }
    }

    return await database.authenticate(credentials.username, credentials.password);
});

ipcMain.handle('get-categories', async () => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest('/api/categories');
        if (result.ok && result.data) {
            return result.data;
        }
    }

    return await database.getCategories();
});
