const { app, BrowserWindow, ipcMain, net, Menu, Tray, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import database
const database = require('./src/js/database');

// ============ CONFIGURATION ============

// IMPORTANT: ใช้ userData directory ของ Electron เท่านั้น
const userDataPath = app.getPath('userData');
console.log('📁 User data path:', userDataPath);

// สร้างโฟลเดอร์ logs ใน userData
const logsDir = path.join(userDataPath, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

let mainWindow;
let tray = null;
let isQuitting = false;

// โหการตั้งค่าจาก config.json
const configPath = path.join(__dirname, 'config.json');
let appConfig = {};
if (fs.existsSync(configPath)) {
    try {
        appConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.warn('⚠️ Invalid config.json:', error);
        appConfig = {
            backendUrl: 'http://127.0.0.1:8000',
            apiTimeoutMs: 5000,
            healthCheckTtlMs: 3000,
            internetCheckUrl: 'https://1.1.1.1/cdn-cgi/trace',
            internetCheckTimeoutMs: 2500,
            requireInternetForOnlineStatus: false
        };
    }
} else {
    appConfig = {
        backendUrl: 'http://127.0.0.1:8000',
        apiTimeoutMs: 5000,
        healthCheckTtlMs: 3000,
        internetCheckUrl: 'https://1.1.1.1/cdn-cgi/trace',
        internetCheckTimeoutMs: 2500,
        requireInternetForOnlineStatus: false
    };
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
        backgroundColor: '#f5f7fa',
        title: 'ระบบจัดการสต็อกสินค้า'
    });

    // โหลดหน้า Login
    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    // แสดงเมื่อพร้อม
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // ป้องกันการเปิดลิงก์ใน Electron window
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
    
    global.mainWindow = mainWindow;
}

// ============ TRAY MANAGEMENT ============

function createTray() {
    try {
        // สร้างโฟลเดอร์ assets ถ้ายังไม่มี
        const assetsDir = path.join(__dirname, 'src', 'assets', 'icons');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        const iconPath = path.join(assetsDir, 'app-icon.png');  
        
        // ถ้าไม่มี icon ให้สร้าง Tray โดยไม่มี icon (ใช้ default)
        if (!fs.existsSync(iconPath)) {
            console.warn('⚠️ Icon file not found at:', iconPath);
            // สร้าง Tray โดยไม่ใช้ icon (fallback)
            tray = new Tray(iconPath);
        } else {
            tray = new Tray(iconPath);
        }

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
        tray.setToolTip('CutStock - ระบบจัดการสต็อกสินค้า\nดับเบิลคลิกเพื่อเปิดโปรแกรม');
        
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
        console.warn('⚠️ System tray creation failed:', error.message);
        // ไม่ต้อง throw error ออกไป
    }
}

// ============ APP LIFE CYCLE ============

app.whenReady().then(async () => {
    console.log('🚀 Starting Stock Management System...');
    
    try {
        // ตรวจสอบว่า database มี initPromise หรือยัง
        if (!database.initPromise) {
            console.log('⚠️ Database initPromise not found, creating new one...');
            database.initPromise = database.initDatabase();
        }
        
        // รอให้ database initialize เสร็จ
        console.log('⏳ Waiting for database initialization...');
        await database.initPromise;
        console.log('✅ Database initialized successfully');
        
        // ตรวจสอบว่าไฟล์ database ถูกสร้างหรือไม่
        if (database.dbPath && fs.existsSync(database.dbPath)) {
            const stats = fs.statSync(database.dbPath);
            console.log(`✅ Database file created: ${database.dbPath} (${stats.size} bytes)`);
        } else {
            console.error('❌ Database file not found after initialization!');
        }
        
    } catch (err) {
        console.error('❌ Database initialization failed:', err);
        dialog.showErrorBox('Database Error', 
            'ไม่สามารถเริ่มต้นฐานข้อมูลได้ กรุณาตรวจสอบและลองใหม่อีกครั้ง\n' +
            'รายละเอียด: ' + err.message
        );
        // ไม่ต้อง return เพื่อให้โปรแกรมยังทำงานต่อไปได้ แต่จะใช้ข้อมูลตัวอย่างแทน
    }
    
    // สร้างหน้าต่างหลังจาก database initialize แล้ว
    createWindow();
    
    // สร้าง tray แบบปลอดภัย
    try {
        createTray();
    } catch (error) {
        console.warn('⚠️ Could not create system tray:', error.message);
    }
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// ป้องกันปิด app เมื่อปิดหน้าต่าง (ซ่อนไปที่ tray แทน)
app.on('window-all-closed', (event) => {
    if (process.platform !== 'darwin') {
        event.preventDefault();
        
        if (mainWindow) {
            mainWindow.hide();
        }
    }
});

// จัดการเมื่อจะปิด app
app.on('before-quit', async (event) => {
    if (!isQuitting) {
        event.preventDefault();
        return;
    }
    
    // ปิด database connection
    if (database) {
        try {
            await database.close();
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
    
    if (tray) {
        tray.destroy();
    }
});

// ============ IPC HANDLERS ============

// Network Handlers
ipcMain.handle('check-online-status', async () => {
    return await isBackendOnline();
});

// Database Check Handler
ipcMain.handle('check-database', async () => {
    try {
        await database.initPromise;
        return { 
            ready: true, 
            message: 'Database is ready',
            path: database.dbPath,
            exists: fs.existsSync(database.dbPath)
        };
    } catch (error) {
        return { ready: false, message: error.message };
    }
});

// Stock Page Check Handler
ipcMain.handle('check-stock-page', async () => {
    const stockPagePath = path.join(__dirname, 'src/stock.html');
    return fs.existsSync(stockPagePath);
});

// App Version Handler
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Product Handlers
ipcMain.handle('save-product', async (event, product) => {
    try {
        await database.initPromise;
        return await database.saveProduct(product);
    } catch (error) {
        console.error('Error saving product:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-products', async (event, searchTerm = '') => {
    try {
        await database.initPromise;
        return await database.getProducts(searchTerm);
    } catch (error) {
        console.error('Error getting products:', error);
        return [];
    }
});

ipcMain.handle('get-product', async (event, id) => {
    try {
        await database.initPromise;
        return await database.getProduct(id);
    } catch (error) {
        console.error('Error getting product:', error);
        return null;
    }
});

ipcMain.handle('delete-product', async (event, id) => {
    try {
        await database.initPromise;
        return await database.deleteProduct(id);
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('search-products', async (event, term) => {
    try {
        await database.initPromise;
        return await database.getProducts(term);
    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
});

// Product Lots Handlers
ipcMain.handle('add-product-lot', async (event, lotData) => {
    try {
        await database.initPromise;
        return await database.addProductLot(lotData);
    } catch (error) {
        console.error('Error adding product lot:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-product-lots', async (event, productId) => {
    try {
        await database.initPromise;
        return await database.getProductLots(productId);
    } catch (error) {
        console.error('Error getting product lots:', error);
        return [];
    }
});

ipcMain.handle('update-product-lot', async (event, lotId, lotData) => {
    try {
        await database.initPromise;
        return await database.updateProductLot(lotId, lotData);
    } catch (error) {
        console.error('Error updating product lot:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-product-lot', async (event, lotId) => {
    try {
        await database.initPromise;
        return await database.deleteProductLot(lotId);
    } catch (error) {
        console.error('Error deleting product lot:', error);
        return { success: false, error: error.message };
    }
});

// Authentication Handlers
ipcMain.handle('login', async (event, credentials) => {
    try {
        await database.initPromise;
        return await database.authenticate(credentials.username, credentials.password);
    } catch (error) {
        console.error('Error during login:', error);
        return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
});

// Shift Handlers
ipcMain.handle('open-shift', async (event, shiftData) => {
    try {
        await database.initPromise;
        return await database.openShift(shiftData);
    } catch (error) {
        console.error('Error opening shift:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-current-shift', async (event, cashier_id) => {
    try {
        await database.initPromise;
        return await database.getCurrentShift(cashier_id);
    } catch (error) {
        console.error('Error getting current shift:', error);
        return null;
    }
});

ipcMain.handle('get-shift-by-id', async (event, shift_id) => {
    try {
        await database.initPromise;
        return await database.getShiftById(shift_id);
    } catch (error) {
        console.error('Error getting shift:', error);
        return null;
    }
});

ipcMain.handle('get-shift-sales', async (event, shift_id) => {
    try {
        await database.initPromise;
        return await database.getShiftSales(shift_id);
    } catch (error) {
        console.error('Error getting shift sales:', error);
        return [];
    }
});

ipcMain.handle('close-shift', async (event, shift_id, closingData) => {
    try {
        await database.initPromise;
        return await database.closeShift(shift_id, closingData);
    } catch (error) {
        console.error('Error closing shift:', error);
        return { success: false, error: error.message };
    }
});

// Supplier Handlers
ipcMain.handle('get-supplier', async (event, code) => {
    try {
        await database.initPromise;
        return await database.getSupplier(code);
    } catch (error) {
        console.error('Error getting supplier:', error);
        return null;
    }
});

ipcMain.handle('get-all-suppliers', async () => {
    try {
        await database.initPromise;
        return await database.getAllSuppliers();
    } catch (error) {
        console.error('Error getting suppliers:', error);
        return [];
    }
});

ipcMain.handle('create-supplier', async (event, supplierData) => {
    try {
        await database.initPromise;
        return await database.createSupplier(supplierData);
    } catch (error) {
        console.error('Error creating supplier:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-supplier', async (event, code, supplierData) => {
    try {
        await database.initPromise;
        return await database.updateSupplier(code, supplierData);
    } catch (error) {
        console.error('Error updating supplier:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-supplier', async (event, code) => {
    try {
        await database.initPromise;
        return await database.deleteSupplier(code);
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return { success: false, error: error.message };
    }
});

// Category Handlers
ipcMain.handle('get-categories', async () => {
    try {
        await database.initPromise;
        return await database.getCategories();
    } catch (error) {
        console.error('Error getting categories:', error);
        return [];
    }
});

// Statistics Handlers
ipcMain.handle('get-statistics', async () => {
    try {
        await database.initPromise;
        return await database.getStockStatistics();
    } catch (error) {
        console.error('Error getting statistics:', error);
        return {
            total_products: 0,
            total_stock: 0,
            total_value: 0,
            out_of_stock: 0,
            low_stock: 0
        };
    }
});

// Sales Handlers
ipcMain.handle('save-sale', async (event, saleData) => {
    try {
        await database.initPromise;
        return await database.saveSale(saleData);
    } catch (error) {
        console.error('Error saving sale:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-sales-history', async (event, limit = 50, shift_id = null) => {
    try {
        await database.initPromise;
        return await database.getSalesHistory(limit, shift_id);
    } catch (error) {
        console.error('Error getting sales history:', error);
        return [];
    }
});

ipcMain.handle('get-sales-report', async (event, startDate, endDate, shift_id = null) => {
    try {
        await database.initPromise;
        return await database.getSalesReport(startDate, endDate, shift_id);
    } catch (error) {
        console.error('Error getting sales report:', error);
        return {
            sales: [],
            items: [],
            total_sales: 0,
            sale_count: 0,
            items_sold: 0,
            payment_methods: {}
        };
    }
});

// ============ REPORT HANDLERS ============

/**
 * ดึงข้อมูลกะที่ปิดแล้วในช่วงวันที่กำหนด
 */
ipcMain.handle('get-closed-shifts', async (event, startDate, endDate) => {
    try {
        await database.ensureInitialized();
        return await database.getClosedShifts(startDate, endDate);
    } catch (error) {
        console.error('❌ Error getting closed shifts:', error);
        return [];
    }
});

/**
 * ดึงยอดขายแยกตามวันและช่องทางในช่วงวันที่กำหนด
 */
ipcMain.handle('get-sales-by-date-range', async (event, startDate, endDate) => {
    try {
        await database.ensureInitialized();
        return await database.getSalesByDateRange(startDate, endDate);
    } catch (error) {
        console.error('❌ Error getting sales by date range:', error);
        return [];
    }
});

/**
 * ดึงรายการขายทั้งหมดในกะ พร้อมรายการสินค้า
 */
ipcMain.handle('get-shift-sales-with-items', async (event, shiftId) => {
    try {
        await database.ensureInitialized();
        return await database.getShiftSalesWithItems(shiftId);
    } catch (error) {
        console.error('❌ Error getting shift sales with items:', error);
        return [];
    }
});

/**
 * ดึงสรุปยอดขายรายวัน
 */
ipcMain.handle('get-daily-sales-summary', async (event, startDate, endDate) => {
    try {
        await database.ensureInitialized();
        return await database.getDailySalesSummary(startDate, endDate);
    } catch (error) {
        console.error('❌ Error getting daily sales summary:', error);
        return [];
    }
});

/**
 * ดึงสินค้าขายดีในช่วงวันที่กำหนด
 */
ipcMain.handle('get-top-products', async (event, startDate, endDate, limit = 10) => {
    try {
        await database.ensureInitialized();
        return await database.getTopProducts(startDate, endDate, limit);
    } catch (error) {
        console.error('❌ Error getting top products:', error);
        return [];
    }
});

/**
 * ดึงสรุปยอดขายแยกตามพนักงาน
 */
ipcMain.handle('get-sales-by-cashier', async (event, startDate, endDate) => {
    try {
        await database.ensureInitialized();
        return await database.getSalesByCashier(startDate, endDate);
    } catch (error) {
        console.error('❌ Error getting sales by cashier:', error);
        return [];
    }
});

/**
 * ดึงสรุปยอดขายรายเดือน
 */
ipcMain.handle('get-monthly-sales', async (event, year) => {
    try {
        await database.ensureInitialized();
        return await database.getMonthlySales(year);
    } catch (error) {
        console.error('❌ Error getting monthly sales:', error);
        return [];
    }
});

/**
 * ดึงข้อมูลการปิดกะ (ส่วนต่าง, ค่าใช้จ่าย) ในช่วงวันที่กำหนด
 */
ipcMain.handle('get-shift-closing-details', async (event, startDate, endDate) => {
    try {
        await database.ensureInitialized();
        return await database.getShiftClosingDetails(startDate, endDate);
    } catch (error) {
        console.error('❌ Error getting shift closing details:', error);
        return [];
    }
});

/**
 * ดึงสถิติภาพรวมสำหรับ dashboard
 */
ipcMain.handle('get-dashboard-stats', async () => {
    try {
        await database.ensureInitialized();
        return await database.getDashboardStats();
    } catch (error) {
        console.error('❌ Error getting dashboard stats:', error);
        return {
            today_sales: 0,
            today_bills: 0,
            month_sales: 0,
            month_bills: 0,
            open_shifts_today: 0,
            closed_shifts_today: 0,
            products_in_stock: 0,
            out_of_stock: 0,
            low_stock: 0,
            stock_value: 0,
            total_suppliers: 0
        };
    }
});

/**
 * ดึงข้อมูลกราฟยอดขายรายชั่วโมงสำหรับวันนี้
 */
ipcMain.handle('get-hourly-sales-today', async () => {
    try {
        await database.ensureInitialized();
        return await database.getHourlySalesToday();
    } catch (error) {
        console.error('❌ Error getting hourly sales:', error);
        return [];
    }
});

// Config Handlers
ipcMain.handle('get-config', async () => {
    return appConfig;
});

ipcMain.handle('update-config', async (event, newConfig) => {
    try {
        appConfig = { ...appConfig, ...newConfig };
        fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
        return { success: true, message: 'Config updated successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// File Management Handlers
ipcMain.handle('get-backup-files', async () => {
    try {
        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            return [];
        }
        
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.db') || file.endsWith('.backup'))
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
        await database.ensureInitialized();
        const sourceFile = backupFile;
        const targetFile = database.dbPath;
        
        // ทำ backup อัตโนมัติก่อน restore
        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const autoBackupFile = path.join(backupDir, `pre_restore_${timestamp}.db`);
        
        if (fs.existsSync(targetFile)) {
            fs.copyFileSync(targetFile, autoBackupFile);
        }
        
        // คัดลอกไฟล์ backup มาที่ target
        fs.copyFileSync(sourceFile, targetFile);
        
        // รีโหลด database
        await database.initDatabase();
        
        return { success: true, message: 'Restore completed successfully' };
    } catch (error) {
        return { success: false, message: 'Restore failed: ' + error.message };
    }
});

ipcMain.handle('create-backup', async () => {
    try {
        await database.ensureInitialized();
        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup_${timestamp}.db`);
        const sourceFile = database.dbPath;
        
        if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, backupFile);
            return { 
                success: true, 
                message: 'Backup created successfully',
                file: backupFile 
            };
        } else {
            return { success: false, message: 'Source database not found' };
        }
    } catch (error) {
        return { success: false, message: 'Backup failed: ' + error.message };
    }
});

// ============ ERROR HANDLING ============

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    const errorLogFile = path.join(logsDir, 'errors.log');
    const errorEntry = {
        timestamp: new Date().toISOString(),
        type: 'uncaughtException',
        error: error.toString(),
        stack: error.stack
    };
    
    try {
        fs.appendFileSync(errorLogFile, JSON.stringify(errorEntry) + '\n', 'utf8');
    } catch (logError) {
        console.error('Failed to write error log:', logError);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    
    const errorLogFile = path.join(logsDir, 'errors.log');
    const errorEntry = {
        timestamp: new Date().toISOString(),
        type: 'unhandledRejection',
        reason: reason ? reason.toString() : 'Unknown reason',
        stack: reason && reason.stack ? reason.stack : null
    };
    
    try {
        fs.appendFileSync(errorLogFile, JSON.stringify(errorEntry) + '\n', 'utf8');
    } catch (logError) {
        console.error('Failed to write error log:', logError);
    }
});     

console.log('✅ Main process initialized');
console.log(`📁 User data directory: ${userDataPath}`);