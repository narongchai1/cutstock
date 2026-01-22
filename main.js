const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net'); // เพิ่ม net module

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

let lastHealthCheckAt = 0;
let lastHealthStatus = false;

// เพิ่ม: กำหนด path สำหรับไฟล์ products
const productsFilePath = path.join(dataDir, 'products.json');

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

async function isBackendOnline() {
    // ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตโดยใช้ net module
    try {
        // วิธีที่ 1: ใช้ net.connect() เพื่อตรวจสอบ
        const client = net.createConnection({
            host: new URL(backendUrl).hostname,
            port: new URL(backendUrl).port || 80,
            timeout: 1000
        });
        
        return new Promise((resolve) => {
            client.on('connect', () => {
                client.end();
                resolve(true);
            });
            
            client.on('error', () => {
                resolve(false);
            });
            
            client.on('timeout', () => {
                client.destroy();
                resolve(false);
            });
        });
    } catch (error) {
        console.log('Network check error:', error);
        return false;
    }
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
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

// ========== ฟังก์ชันสำหรับ Reports ==========

// ฟังก์ชันดึงข้อมูลสินค้าจากไฟล์ (ดึงจาก stock เดียวกัน)
function getProductsFromStock() {
    try {
        if (fs.existsSync(productsFilePath)) {
            const data = fs.readFileSync(productsFilePath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading products for reports:', error);
        return [];
    }
}

// ฟังก์ชันคำนวณสถิติรายงาน
function calculateReportStats(products) {
    const stats = {
        totalProducts: products.length,
        inStock: 0,
        limitedStock: 0,
        outOfStock: 0,
        totalValue: 0,
        totalCost: 0,
        potentialProfit: 0,
        categories: {},
        lowStockItems: [],
        highValueItems: [],
        recentTransactions: []
    };

    products.forEach(product => {
        const stock = product.stock || 0;
        const price = product.price || 0;
        const cost = product.cost || 0;

        // สถานะสินค้า
        if (stock === 0) {
            stats.outOfStock++;
        } else if (stock <= 10) {
            stats.limitedStock++;
        } else {
            stats.inStock++;
        }

        // มูลค่า
        const itemValue = stock * price;
        const itemCost = stock * cost;
        stats.totalValue += itemValue;
        stats.totalCost += itemCost;
        stats.potentialProfit += (itemValue - itemCost);

        // หมวดหมู่
        const category = product.category || 'ไม่มีหมวดหมู่';
        if (!stats.categories[category]) {
            stats.categories[category] = {
                count: 0,
                value: 0,
                cost: 0,
                profit: 0
            };
        }
        stats.categories[category].count++;
        stats.categories[category].value += itemValue;
        stats.categories[category].cost += itemCost;
        stats.categories[category].profit += (itemValue - itemCost);

        // สินค้าใกล้หมด
        if (stock > 0 && stock <= 5) {
            stats.lowStockItems.push({
                name: product.name,
                stock: stock,
                id: product.id,
                status: 'ใกล้หมด'
            });
        }

        // สินค้ามูลค่าสูง
        if (itemValue > 10000) {
            stats.highValueItems.push({
                name: product.name,
                value: itemValue,
                id: product.id,
                stock: stock
            });
        }

        // ธุรกรรมล่าสุด (จำลองจากวันที่อัพเดท)
        stats.recentTransactions.push({
            date: product.updatedAt || product.createdAt || new Date().toISOString().split('T')[0],
            code: product.code || product.id,
            name: product.name,
            quantity: product.lastTransaction || 1,
            price: price,
            status: stock > 0 ? 'สำเร็จ' : 'รอดำเนินการ'
        });
    });

    // เรียงลำดับ
    stats.lowStockItems.sort((a, b) => a.stock - b.stock);
    stats.highValueItems.sort((a, b) => b.value - a.value);
    stats.recentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    return stats;
}

// ส่งออกรายงานเป็น Excel
function exportToExcel(data) {
    try {
        const XLSX = require('xlsx');
        
        // สร้างข้อมูลสำหรับ Excel
        const worksheetData = [
            ['หมวดหมู่', 'จำนวนสินค้า', 'มูลค่ารวม', 'ต้นทุนรวม', 'กำไรที่คาดการณ์'],
            ...Object.entries(data.categories).map(([category, catData]) => [
                category,
                catData.count,
                catData.value,
                catData.cost,
                catData.profit
            ]),
            ['รวมทั้งหมด', data.totalProducts, data.totalValue, data.totalCost, data.potentialProfit]
        ];

        // สร้าง worksheet
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // สร้าง workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'รายงานสต็อก');

        // บันทึกไฟล์
        const downloadPath = app.getPath('downloads');
        const filePath = path.join(downloadPath, `รายงานสต็อก_${Date.now()}.xlsx`);
        XLSX.writeFile(wb, filePath);

        return { success: true, filePath };
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return { success: false, error: error.message };
    }
}

// ฟังก์ชันกรองตามวันที่
function filterProductsByDate(products, startDate, endDate) {
    if (!startDate || !endDate) return products;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return products.filter(product => {
        const productDate = new Date(product.createdAt || product.updatedAt || Date.now());
        return productDate >= start && productDate <= end;
    });
}

// ในฟังก์ชัน createWindow หรือส่วนที่เซ็ต up IPC handlers
function setupReportHandlers() {
    // ตรวจสอบสถานะออนไลน์ (มีอยู่แล้วแต่เพิ่มให้ครบ)
    ipcMain.handle('check-online-status', async () => {
        return await isBackendOnline();
    });

    // ดึงข้อมูลสินค้าสำหรับรายงาน
    ipcMain.handle('get-products-for-report', async (event, startDate, endDate) => {
        try {
            const isOnline = await isBackendOnline();
            let products = [];
            
            if (isOnline) {
                const result = await apiRequest('/api/products');
                if (result.ok && Array.isArray(result.data)) {
                    products = result.data;
                } else {
                    products = getProductsFromStock();
                }
            } else {
                products = getProductsFromStock();
            }
            
            if (startDate && endDate) {
                return filterProductsByDate(products, startDate, endDate);
            }
            
            return products;
        } catch (error) {
            console.error('Error getting products for report:', error);
            return getProductsFromStock();
        }
    });

    // ดึงสถิติรายงาน
    ipcMain.handle('get-report-stats', async (event, startDate, endDate) => {
        try {
            let products = [];
            const isOnline = await isBackendOnline();
            
            if (isOnline) {
                const result = await apiRequest('/api/products');
                if (result.ok && Array.isArray(result.data)) {
                    products = result.data;
                } else {
                    products = getProductsFromStock();
                }
            } else {
                products = getProductsFromStock();
            }
            
            if (startDate && endDate) {
                products = filterProductsByDate(products, startDate, endDate);
            }
            
            return calculateReportStats(products);
        } catch (error) {
            console.error('Error getting report stats:', error);
            return calculateReportStats(getProductsFromStock());
        }
    });

    // ส่งออก Excel
    ipcMain.handle('export-report-excel', async (event) => {
        try {
            let products = [];
            const isOnline = await isBackendOnline();
            
            if (isOnline) {
                const result = await apiRequest('/api/products');
                if (result.ok && Array.isArray(result.data)) {
                    products = result.data;
                } else {
                    products = getProductsFromStock();
                }
            } else {
                products = getProductsFromStock();
            }
            
            const stats = calculateReportStats(products);
            return exportToExcel(stats);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return { success: false, error: error.message };
        }
    });

    // ฟังการเปลี่ยนสถานะเครือข่าย - แก้ไขตรงนี้
    ipcMain.on('listen-online-status', (event) => {
        // ส่งสถานะเริ่มต้น
        isBackendOnline().then(isOnline => {
            event.sender.send('online-status-changed', isOnline);
        });

        // สร้าง interval เพื่อตรวจสอบสถานะเครือข่าย
        const intervalId = setInterval(async () => {
            const isOnline = await isBackendOnline();
            event.sender.send('online-status-changed', isOnline);
        }, 5000); // ตรวจสอบทุก 5 วินาที

        // ลบ interval เมื่อหน้าต่างปิด
        event.sender.on('destroyed', () => {
            clearInterval(intervalId);
        });
    });

    // รายงานแบบด่วน
    ipcMain.handle('get-quick-report', async () => {
        try {
            const products = getProductsFromStock();
            const stats = calculateReportStats(products);
            
            return {
                success: true,
                totalProducts: stats.totalProducts,
                inStock: stats.inStock,
                limitedStock: stats.limitedStock,
                outOfStock: stats.outOfStock,
                totalValue: stats.totalValue,
                lowStockCount: stats.lowStockItems.length,
                highValueCount: stats.highValueItems.length,
                recentTransactions: stats.recentTransactions.slice(0, 5)
            };
        } catch (error) {
            console.error('Error generating quick report:', error);
            return { success: false, error: error.message };
        }
    });

    // อัพเดทสถานะเครือข่าย
    ipcMain.handle('update-network-status', async () => {
        return await isBackendOnline();
    });
}

// ========== IPC Handlers เดิม ==========

const database = require('./src/js/database');

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

// ========== App Lifecycle ==========

app.whenReady().then(() => {
    const win = createWindow();
    setupReportHandlers();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const newWin = createWindow();
            setupReportHandlers();
        }
    });

    // ตั้งค่า event listeners สำหรับเครือข่าย
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            // ฟังการเปลี่ยนแปลงเครือข่าย
            window.addEventListener('online', () => {
                if (window.updateNetworkStatus) {
                    window.updateNetworkStatus(true);
                }
            });
            
            window.addEventListener('offline', () => {
                if (window.updateNetworkStatus) {
                    window.updateNetworkStatus(false);
                }
            });
        `);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Export สำหรับใช้ใน preload
module.exports = {
    isBackendOnline,
    setupReportHandlers,
    getProductsFromStock,
    calculateReportStats
};