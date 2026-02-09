const { app, BrowserWindow, ipcMain, net, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

// Import database
const database = require('./src/js/database');

// ============ CONFIGURATION ============

// สร้างโฟลเดอร์ข้อมูล
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let mainWindow;
let tray = null;
let isQuitting = false;

// โหลดการตั้งค่าจาก config.json
const configPath = path.join(__dirname, 'config.json');
let appConfig = {};
if (fs.existsSync(configPath)) {
    try {
        appConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.warn('⚠️ Invalid config.json:', error);
        // ใช้ค่า default ถ้า config ผิดพลาด
        appConfig = {
            backendUrl: 'http://127.0.0.1:8000',
            apiTimeoutMs: 5000,
            healthCheckTtlMs: 3000
        };
    }
} else {
    // สร้าง config เริ่มต้นถ้าไม่มีไฟล์
    appConfig = {
        backendUrl: 'http://127.0.0.1:8000',
        apiTimeoutMs: 5000,
        healthCheckTtlMs: 3000
    };
    
    // บันทึก config เริ่มต้น
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
}

// ============ NETWORK FUNCTIONS ============

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

// ============ WINDOW MANAGEMENT ============

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'src/assets/icons/app-icon.png'),
        show: false,
        backgroundColor: '#f5f7fa'
    });

    // โหลดหน้า Login
    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    // แสดงเมื่อพร้อม
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // เปิด DevTools สำหรับการพัฒนา
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // บันทึก reference ใน global
    global.mainWindow = mainWindow;
}

// ============ TRAY MANAGEMENT ============

function createTray() {
    try {
        const iconPath = path.join(__dirname, 'src/assets/icons/app-icon.png');
        
        tray = new Tray(iconPath);
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'เปิดโปรแกรม',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    } else {
                        createWindow();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'ออกจากระบบ',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);
        
        tray.setContextMenu(contextMenu);
        
        tray.setToolTip('ระบบจัดการสต็อกสินค้า\nดับเบิลคลิกเพื่อเปิดโปรแกรม');
        
        // ดับเบิลคลิกเพื่อเปิดโปรแกรม
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            } else {
                createWindow();
            }
        });
        
        console.log('✅ System tray created');
        
    } catch (error) {
        console.error('❌ Error creating system tray:', error);
    }
}

// ============ APP LIFE CYCLE ============

app.whenReady().then(() => {
    console.log('🚀 Starting Stock Management System...');
    
    // เริ่มต้น database
    database.initDatabase().catch(err => {
        console.error('❌ Database initialization failed:', err);
    });
    
    // สร้างหน้าต่างหลัก
    createWindow();
    
    // สร้าง system tray
    createTray();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// ป้องกันปิด app เมื่อปิดหน้าต่าง
app.on('window-all-closed', (event) => {
    if (process.platform !== 'darwin') {
        event.preventDefault();
        
        if (mainWindow) {
            mainWindow.hide();
        }
    }
});

// จัดการเมื่อจะปิด app
app.on('before-quit', (event) => {
    if (!isQuitting) {
        event.preventDefault();
        return;
    }
    
    // ปิด tray
    if (tray) {
        tray.destroy();
    }
});

// ============ IPC HANDLERS ============

// Network Handlers
ipcMain.handle('check-online-status', async () => {
    return await isBackendOnline();
});

// Product Handlers
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

ipcMain.handle('get-products', async (event, searchTerm = '') => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest('/api/products');
        if (result.ok && Array.isArray(result.data)) {
            return result.data;
        }
    }

    return await database.getProducts(searchTerm);
});

ipcMain.handle('get-product', async (event, id) => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest(`/api/products/${encodeURIComponent(id)}`);
        if (result.ok && result.data) {
            return result.data;
        }
    }

    return await database.getProductById(id);
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

// Authentication Handlers
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

// Category Handlers
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

// Statistics Handlers
ipcMain.handle('get-statistics', async () => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest('/api/statistics');
        if (result.ok && result.data) {
            return result.data;
        }
    }

    return await database.getStockStatistics();
});

// Search Handlers
ipcMain.handle('search-products', async (event, searchTerm) => {
    const isOnline = await isBackendOnline();
    if (isOnline) {
        const result = await apiRequest(`/api/products/search?q=${encodeURIComponent(searchTerm)}`);
        if (result.ok && Array.isArray(result.data)) {
            return result.data;
        }
    }

    return await database.getProducts(searchTerm);
});

// Config Handlers
ipcMain.handle('get-config', async () => {
    return appConfig;
});

ipcMain.handle('update-config', async (event, newConfig) => {
    try {
        // อัพเดท config
        appConfig = { ...appConfig, ...newConfig };
        
        // บันทึกลงไฟล์
        fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
        
        return { success: true, message: 'Config updated successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// File Management Handlers
ipcMain.handle('get-backup-files', async () => {
    try {
        const backupDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupDir)) {
            return [];
        }
        
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.db'))
            .map(file => {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    modified: stats.mtime,
                    created: stats.birthtime
                };
            })
            .sort((a, b) => b.modified - a.modified);
        
        return files;
    } catch (error) {
        console.error('Error getting backup files:', error);
        return [];
    }
});

ipcMain.handle('restore-backup', async (event, backupFile) => {
    try {
        const sourceFile = backupFile;
        const targetFile = database.dbPath;
        
        // คัดลอกไฟล์ backup ไปยัง database
        fs.copyFileSync(sourceFile, targetFile);
        
        // รีสตาร์ท database connection
        await database.initDatabase();
        
        return { 
            success: true, 
            message: 'Restore completed successfully' 
        };
    } catch (error) {
        return { 
            success: false, 
            message: 'Restore failed: ' + error.message 
        };
    }
});

// ============ ERROR HANDLING ============

// จัดการ uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    // บันทึก error log
    const errorLogDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(errorLogDir)) {
        fs.mkdirSync(errorLogDir, { recursive: true });
    }
    
    const errorLogFile = path.join(errorLogDir, 'errors.log');
    const errorEntry = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack
    };
    
    fs.appendFileSync(errorLogFile, JSON.stringify(errorEntry) + '\n', 'utf8');
});

// จัดการ unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Main process initialized');