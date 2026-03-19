// src/js/database.js - ฉบับแก้ไข

const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

class Database {
    constructor() {
        console.log('📦 Database constructor called');
        
        this.dbPath = null;
        this.db = null;
        this.initPromise = null;
        this.isInitialized = false;
        
        // รอให้ app พร้อมก่อนค่อย initialize
        if (app && app.isReady()) {
            console.log('✅ App is ready, initializing now...');
            this.initialize();
        } else if (app) {
            console.log('⏳ App not ready, waiting for ready event...');
            app.whenReady().then(() => {
                console.log('✅ App became ready, initializing database...');
                this.initialize();
            });
        } else {
            console.error('❌ App object not available');
        }
    }

    initialize() {
        try {
            // ใช้ userData directory ของ Electron
            const userDataPath = app.getPath('userData');
            console.log('📁 User data path:', userDataPath);
            
            // สร้างโฟลเดอร์ data ถ้ายังไม่มี
            const dataDir = path.join(userDataPath, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log('📁 Created data directory');
            }
            
            this.dbPath = path.join(dataDir, 'cutstock.db');
            console.log('📁 Database path:', this.dbPath);
            
            // เปิด connection
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error opening database:', err);
                } else {
                    console.log('✅ Database connection opened');
                    
                    // ตรวจสอบว่าไฟล์ถูกสร้างหรือไม่
                    if (fs.existsSync(this.dbPath)) {
                        const stats = fs.statSync(this.dbPath);
                        console.log(`✅ Database file exists: ${this.dbPath} (${stats.size} bytes)`);
                    }
                }
            });
            
            // เริ่มต้น database
            this.initPromise = this.initDatabase();
            
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    async ensureInitialized() {
        if (this.isInitialized && this.db) {
            return true;
        }
        
        if (!this.initPromise) {
            console.log('🔄 Initializing database now...');
            this.initialize();
        }
        
        try {
            await this.initPromise;
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    async initDatabase() {
        // รอให้ db พร้อม
        if (!this.db) {
            console.log('⏳ Waiting for database connection...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!this.db) {
                throw new Error('Database connection not established');
            }
        }

        return new Promise((resolve, reject) => {
            console.log('🔄 Creating database tables...');
            
            try {
                this.db.serialize(() => {
                    // ============ CREATE TABLES ============
                    
                    // ตาราง products
                    this.db.run(`CREATE TABLE IF NOT EXISTS products (
                        id TEXT PRIMARY KEY,
                        barcode TEXT UNIQUE,
                        name TEXT NOT NULL,
                        description TEXT,
                        price REAL DEFAULT 0,
                        cost REAL DEFAULT 0,
                        stock INTEGER DEFAULT 0,
                        min_stock INTEGER DEFAULT 10,
                        max_stock INTEGER DEFAULT 100,
                        unit TEXT DEFAULT 'ชิ้น',
                        category TEXT,
                        subcategory TEXT,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )`);

                    // ตาราง product_lots
                    this.db.run(`CREATE TABLE IF NOT EXISTS product_lots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        product_id TEXT NOT NULL,
                        lot_number TEXT NOT NULL,
                        product_number TEXT,
                        expiry_date DATE,
                        has_no_expiry INTEGER DEFAULT 0,
                        quantity INTEGER DEFAULT 0,
                        supplier_code TEXT,
                        received_date DATE DEFAULT CURRENT_DATE,
                        warranty TEXT,
                        cost REAL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
                    )`);

                    // ตาราง users
                    this.db.run(`CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        name TEXT NOT NULL,
                        role TEXT DEFAULT 'staff',
                        email TEXT,
                        phone TEXT,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )`);

                    // ตาราง sales
                    this.db.run(`CREATE TABLE IF NOT EXISTS sales (
                        id TEXT PRIMARY KEY,
                        shift_id TEXT,
                        subtotal REAL NOT NULL DEFAULT 0,
                        tax REAL NOT NULL DEFAULT 0,
                        total REAL NOT NULL DEFAULT 0,
                        payment_method TEXT NOT NULL,
                        vat_type TEXT DEFAULT 'exclude',
                        vat_rate REAL DEFAULT 7,
                        cashier_id INTEGER,
                        cashier_name TEXT NOT NULL,
                        payment_details TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (shift_id) REFERENCES shifts (id)
                    )`);

                    // ตาราง sale_items
                    this.db.run(`CREATE TABLE IF NOT EXISTS sale_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sale_id TEXT NOT NULL,
                        product_id TEXT NOT NULL,
                        product_name TEXT NOT NULL,
                        quantity INTEGER NOT NULL DEFAULT 0,
                        price REAL NOT NULL DEFAULT 0,
                        total_price REAL NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
                        FOREIGN KEY (product_id) REFERENCES products (id)
                    )`);

                    // ตาราง shifts
                    this.db.run(`CREATE TABLE IF NOT EXISTS shifts (
                        id TEXT PRIMARY KEY,
                        cashier_id INTEGER NOT NULL,
                        cashier_name TEXT NOT NULL,
                        shift_number TEXT NOT NULL,
                        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        closed_at TIMESTAMP,
                        opening_balance REAL DEFAULT 0,
                        closing_balance REAL DEFAULT 0,
                        expected_balance REAL DEFAULT 0,
                        difference REAL DEFAULT 0,
                        total_sales_count INTEGER DEFAULT 0,
                        total_sales_amount REAL DEFAULT 0,
                        expenses REAL DEFAULT 0,
                        cash_drop REAL DEFAULT 0,
                        notes TEXT,
                        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed')),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )`);

                    // ตาราง suppliers
                    this.db.run(`CREATE TABLE IF NOT EXISTS suppliers (
                        code TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        contact_person TEXT,
                        phone TEXT,
                        email TEXT,
                        address TEXT,
                        tax_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )`);

                    console.log('✅ All tables created');

                    // ============ CHECK AND INSERT INITIAL DATA ============
                    this.checkAndInsertInitialData()
                        .then(() => {
                            console.log('✅ Database initialization completed');
                            this.isInitialized = true;
                            resolve();
                        })
                        .catch(err => {
                            console.error('❌ Error inserting initial data:', err);
                            this.isInitialized = true; // ยังถือว่าสำเร็จ
                            resolve();
                        });
                });
            } catch (error) {
                console.error('❌ Error in initDatabase:', error);
                reject(error);
            }
        });
    }

    async checkAndInsertInitialData() {
        try {
            // ตรวจสอบ users
            const userCount = await this.getCount('users');
            if (userCount === 0) {
                console.log('📝 Inserting default users...');
                await this.insertDefaultUsers();
            }

            // ตรวจสอบ suppliers
            const supplierCount = await this.getCount('suppliers');
            if (supplierCount === 0) {
                console.log('📝 Inserting default suppliers...');
                await this.insertDefaultSuppliers();
            }

            // ตรวจสอบ products
            const productCount = await this.getCount('products');
            if (productCount === 0) {
                console.log('📝 Inserting default products...');
                await this.insertDefaultProducts();
            }

        } catch (error) {
            console.error('Error in checkAndInsertInitialData:', error);
            throw error;
        }
    }

    getCount(tableName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(0);
                return;
            }

            this.db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                if (err) {
                    console.error(`Error counting ${tableName}:`, err);
                    resolve(0);
                } else {
                    resolve(row?.count || 0);
                }
            });
        });
    }

    async insertDefaultUsers() {
        const users = [
            ['admin', 'admin123', 'ผู้ดูแลระบบ', 'admin', 'admin@example.com', '0812345678'],
            ['manager', 'manager123', 'ผู้จัดการ', 'admin', 'manager@example.com', '0823456789'],
            ['staff1', 'staff123', 'พนักงานขาย 1', 'staff', 'staff1@example.com', '0834567890'],
            ['staff2', 'staff456', 'พนักงานขาย 2', 'staff', 'staff2@example.com', '0845678901']
        ];

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO users (username, password, name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)');
            
            let completed = 0;
            users.forEach((user, index) => {
                stmt.run(user, function(err) {
                    if (err) {
                        console.error('Error inserting user:', err);
                    }
                    completed++;
                    if (completed === users.length) {
                        stmt.finalize();
                        console.log(`✅ Inserted ${users.length} users`);
                        resolve();
                    }
                });
            });
        });
    }

    async insertDefaultSuppliers() {
        const suppliers = [
            ['SUP001', 'บริษัท ไทยฟู้ดส์ จำกัด', 'สมชาย ใจดี', '02-123-4567', 'contact@thaifoods.co.th', '123 ถนนสุขุมวิท กรุงเทพฯ 10110', '0105556123456'],
            ['SUP002', 'ห้างหุ้นส่วนจำกัด ซีฟู้ดส์ไทย', 'วิภา รักงาน', '02-234-5678', 'info@seafoodthai.com', '456 ถนนรัชดาภิเษก กรุงเทพฯ 10400', '0105556234567'],
            ['SUP003', 'บริษัท อิเล็กทรอนิกส์ไทย จำกัด', 'ประสิทธิ์ เทคโนโลยี', '02-345-6789', 'sales@electhai.com', '789 ถนนพระราม 4 กรุงเทพฯ 10500', '0105556345678'],
            ['SUP004', 'ร้าน เครื่องเขียน พลอย', 'พลอย แสนดี', '02-456-7890', 'ployshop@gmail.com', '321 ถนนลาดพร้าว กรุงเทพฯ 10900', '0105556456789']
        ];

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO suppliers (code, name, contact_person, phone, email, address, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
            
            let completed = 0;
            suppliers.forEach((supplier, index) => {
                stmt.run(supplier, function(err) {
                    if (err) {
                        console.error('Error inserting supplier:', err);
                    }
                    completed++;
                    if (completed === suppliers.length) {
                        stmt.finalize();
                        console.log(`✅ Inserted ${suppliers.length} suppliers`);
                        resolve();
                    }
                });
            });
        });
    }

    async insertDefaultProducts() {
        const products = [
            ['P001', '8851234567890', 'ข้าวสารหอมมะลิ 5 กก.', 'ข้าวหอมมะลิแท้ จากจังหวัดสุรินทร์', 250.00, 200.00, 50, 10, 100, 'ถุง', 'อาหารแห้ง', 'ข้าวสาร', 'active'],
            ['P002', '8851234567891', 'น้ำปลาตราปลาหมึก 750 ml', 'น้ำปลาแท้ หมักเต็มที่ รสชาติกลมกล่อม', 45.00, 32.00, 80, 20, 150, 'ขวด', 'เครื่องปรุง', 'น้ำปลา', 'active'],
            ['P003', '8851234567892', 'น้ำมันพืช 1 ลิตร', 'น้ำมันพืชบริสุทธิ์ จากเมล็ดทานตะวัน', 65.00, 52.00, 45, 15, 80, 'ขวด', 'เครื่องปรุง', 'น้ำมัน', 'active'],
            ['P004', '8851234567893', 'ไข่ไก่เบอร์ 2 (แผง 30 ฟอง)', 'ไข่ไก่สดใหม่ ส่งตรงจากฟาร์ม', 120.00, 100.00, 30, 10, 50, 'แผง', 'อาหารสด', 'ไข่', 'active'],
            ['P005', '8851234567894', 'นมสดยูเอชที 200 ml', 'นมโคแท้ 100% รสจืด', 25.00, 18.00, 120, 30, 200, 'กล่อง', 'เครื่องดื่ม', 'นม', 'active']
        ];

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`INSERT INTO products 
                (id, barcode, name, description, price, cost, stock, min_stock, max_stock, unit, category, subcategory, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            
            let completed = 0;
            products.forEach((product, index) => {
                stmt.run(product, function(err) {
                    if (err) {
                        console.error('Error inserting product:', err);
                    }
                    completed++;
                    if (completed === products.length) {
                        stmt.finalize();
                        console.log(`✅ Inserted ${products.length} products`);
                        
                        // เพิ่มล็อตสินค้า
                        this.insertDefaultLots()
                            .then(resolve)
                            .catch(reject);
                    }
                });
            });
        });
    }

    async insertDefaultLots() {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        
        const lots = [
            ['P001', 'LOT001', 'BATCH-P001-001', expiryDate.toISOString().split('T')[0], 0, 50, 'SUP001', new Date().toISOString().split('T')[0], '6 เดือน', 200.00],
            ['P002', 'LOT002', 'BATCH-P002-001', expiryDate.toISOString().split('T')[0], 0, 80, 'SUP002', new Date().toISOString().split('T')[0], '1 ปี', 32.00],
            ['P003', 'LOT003', 'BATCH-P003-001', expiryDate.toISOString().split('T')[0], 0, 45, 'SUP001', new Date().toISOString().split('T')[0], '1 ปี', 52.00],
            ['P004', 'LOT004', 'BATCH-P004-001', expiryDate.toISOString().split('T')[0], 0, 30, 'SUP002', new Date().toISOString().split('T')[0], '14 วัน', 100.00],
            ['P005', 'LOT005', 'BATCH-P005-001', expiryDate.toISOString().split('T')[0], 0, 120, 'SUP001', new Date().toISOString().split('T')[0], '6 เดือน', 18.00]
        ];

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`INSERT INTO product_lots 
                (product_id, lot_number, product_number, expiry_date, has_no_expiry, quantity, supplier_code, received_date, warranty, cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            
            let completed = 0;
            lots.forEach((lot, index) => {
                stmt.run(lot, function(err) {
                    if (err) {
                        console.error('Error inserting lot:', err);
                    }
                    completed++;
                    if (completed === lots.length) {
                        stmt.finalize();
                        console.log(`✅ Inserted ${lots.length} product lots`);
                        resolve();
                    }
                });
            });
        });
    }

    // ============ CRUD METHODS ============

    async saveProduct(productData) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM products WHERE id = ?', [productData.id], (err, existing) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const now = new Date().toISOString();
                
                if (existing) {
                    // Update
                    const sql = `UPDATE products SET 
                        barcode = ?, name = ?, description = ?, price = ?, cost = ?, 
                        stock = ?, min_stock = ?, max_stock = ?, unit = ?, 
                        category = ?, subcategory = ?, status = ?, updated_at = ?
                        WHERE id = ?`;
                    
                    const params = [
                        productData.barcode || null,
                        productData.name,
                        productData.description || null,
                        productData.price || 0,
                        productData.cost || 0,
                        productData.stock || 0,
                        productData.min_stock || 10,
                        productData.max_stock || 100,
                        productData.unit || 'ชิ้น',
                        productData.category || null,
                        productData.subcategory || null,
                        productData.status || 'active',
                        now,
                        productData.id
                    ];
                    
                    this.db.run(sql, params, function(err) {
                        if (err) reject(err);
                        else resolve({ success: true, action: 'update', changes: this.changes });
                    });
                } else {
                    // Insert
                    const sql = `INSERT INTO products 
                        (id, barcode, name, description, price, cost, stock, min_stock, max_stock, unit, category, subcategory, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    
                    const params = [
                        productData.id,
                        productData.barcode || null,
                        productData.name,
                        productData.description || null,
                        productData.price || 0,
                        productData.cost || 0,
                        productData.stock || 0,
                        productData.min_stock || 10,
                        productData.max_stock || 100,
                        productData.unit || 'ชิ้น',
                        productData.category || null,
                        productData.subcategory || null,
                        productData.status || 'active',
                        now,
                        now
                    ];
                    
                    this.db.run(sql, params, function(err) {
                        if (err) reject(err);
                        else resolve({ success: true, action: 'insert', lastID: this.lastID });
                    });
                }
            });
        });
    }

    async getProducts(searchTerm = '') {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM products';
            let params = [];
            
            if (searchTerm) {
                sql += ` WHERE id LIKE ? OR barcode LIKE ? OR name LIKE ? OR category LIKE ? OR subcategory LIKE ?`;
                const searchPattern = `%${searchTerm}%`;
                params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
            }
            
            sql += ' ORDER BY created_at DESC';
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Error getting products:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getProduct(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async deleteProduct(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve({ success: true, deleted: this.changes > 0, changes: this.changes });
            });
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async authenticate(username, password) {
        try {
            const user = await this.getUserByUsername(username);
            
            if (!user) {
                return { success: false, message: 'ไม่พบชื่อผู้ใช้' };
            }
            
            if (user.password !== password) {
                return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
            }
            
            const { password: _, ...userWithoutPassword } = user;
            return {
                success: true,
                user: userWithoutPassword,
                token: 'local-token-' + Date.now()
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
        }
    }

    async getStockStatistics() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_products,
                    SUM(stock) as total_stock,
                    SUM(price * stock) as total_value,
                    SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                    SUM(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END) as low_stock
                FROM products
            `;
            
            this.db.get(sql, (err, row) => {
                if (err) reject(err);
                else {
                    resolve(row || {
                        total_products: 0,
                        total_stock: 0,
                        total_value: 0,
                        out_of_stock: 0,
                        low_stock: 0
                    });
                }
            });
        });
    }

    async getCategories() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT category, COUNT(*) as count 
                FROM products 
                WHERE category IS NOT NULL 
                GROUP BY category 
                ORDER BY category
            `;
            
            this.db.all(sql, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // ============ PRODUCT LOTS METHODS ============

    async addProductLot(lotData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO product_lots 
                (product_id, lot_number, product_number, expiry_date, has_no_expiry, quantity, supplier_code, received_date, warranty, cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const params = [
                lotData.product_id,
                lotData.lot_number || `LOT-${Date.now()}`,
                lotData.product_number || null,
                lotData.expiry_date,
                lotData.has_no_expiry ? 1 : 0,
                lotData.quantity || 0,
                lotData.supplier_code || null,
                lotData.received_date || new Date().toISOString().split('T')[0],
                lotData.warranty || null,
                lotData.cost || null
            ];
            
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Error inserting product lot:', err);
                    reject(err);
                } else {
                    resolve({ success: true, id: this.lastID });
                }
            });
        });
    }

    async getProductLots(productId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM product_lots WHERE product_id = ? ORDER BY has_no_expiry DESC, expiry_date';
            
            this.db.all(sql, [productId], (err, rows) => {
                if (err) {
                    console.error('Error getting product lots:', err);
                    reject(err);
                } else {
                    const lots = (rows || []).map(row => ({
                        ...row,
                        has_no_expiry: row.has_no_expiry === 1
                    }));
                    resolve(lots);
                }
            });
        });
    }

    async updateProductLot(lotId, lotData) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE product_lots SET 
                lot_number = ?, product_number = ?, expiry_date = ?, has_no_expiry = ?,
                quantity = ?, supplier_code = ?, received_date = ?, warranty = ?, cost = ?
                WHERE id = ?`;
            
            const params = [
                lotData.lot_number,
                lotData.product_number,
                lotData.expiry_date,
                lotData.has_no_expiry ? 1 : 0,
                lotData.quantity,
                lotData.supplier_code,
                lotData.received_date,
                lotData.warranty,
                lotData.cost,
                lotId
            ];
            
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ success: true, changes: this.changes });
            });
        });
    }

    async deleteProductLot(lotId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM product_lots WHERE id = ?', [lotId], function(err) {
                if (err) reject(err);
                else resolve({ success: true, deleted: this.changes > 0 });
            });
        });
    }

    // ============ SUPPLIER METHODS ============

    async createSupplier(supplierData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO suppliers 
                        (code, name, contact_person, phone, email, address, tax_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            const params = [
                supplierData.code,
                supplierData.name,
                supplierData.contact_person || null,
                supplierData.phone || null,
                supplierData.email || null,
                supplierData.address || null,
                supplierData.tax_id || null
            ];
            
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ success: true, code: supplierData.code });
            });
        });
    }

    async getSupplier(code) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM suppliers WHERE code = ?', [code], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getAllSuppliers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM suppliers ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async updateSupplier(code, supplierData) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE suppliers SET 
                        name = ?, contact_person = ?, phone = ?, email = ?, address = ?, tax_id = ?
                        WHERE code = ?`;
            
            const params = [
                supplierData.name,
                supplierData.contact_person,
                supplierData.phone,
                supplierData.email,
                supplierData.address,
                supplierData.tax_id,
                code
            ];
            
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ success: true, changes: this.changes });
            });
        });
    }

    async deleteSupplier(code) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM suppliers WHERE code = ?', [code], function(err) {
                if (err) reject(err);
                else resolve({ success: true, deleted: this.changes > 0 });
            });
        });
    }

    // ============ SHIFT METHODS ============

    async openShift(shiftData) {
        return new Promise((resolve, reject) => {
            const shiftId = 'SHIFT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const today = new Date();
            const shiftNumber = today.getFullYear() + 
                String(today.getMonth() + 1).padStart(2, '0') + 
                String(today.getDate()).padStart(2, '0') + '-' +
                String(today.getHours()).padStart(2, '0') +
                String(today.getMinutes()).padStart(2, '0');
            
            const sql = `INSERT INTO shifts 
                        (id, cashier_id, cashier_name, shift_number, opening_balance, notes, status)
                        VALUES (?, ?, ?, ?, ?, ?, 'open')`;
            
            const params = [
                shiftId,
                shiftData.cashier_id,
                shiftData.cashier_name,
                shiftNumber,
                shiftData.opening_balance || 0,
                shiftData.notes || null
            ];
            
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else {
                    resolve({
                        success: true,
                        shift_id: shiftId,
                        shift_number: shiftNumber,
                        opened_at: new Date().toISOString()
                    });
                }
            });
        });
    }

    async getCurrentShift(cashier_id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM shifts WHERE cashier_id = ? AND status = "open" ORDER BY opened_at DESC LIMIT 1';
            this.db.get(sql, [cashier_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getShiftById(shift_id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM shifts WHERE id = ?';
            this.db.get(sql, [shift_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getShiftSales(shift_id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM sales WHERE shift_id = ? ORDER BY created_at';
            this.db.all(sql, [shift_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async closeShift(shift_id, closingData) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // ดึงข้อมูลการขายในกะนี้
                this.db.all('SELECT * FROM sales WHERE shift_id = ?', [shift_id], (err, sales) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const totalSalesCount = sales.length;
                    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
                    
                    // ดึงข้อมูลกะ
                    this.db.get('SELECT opening_balance FROM shifts WHERE id = ?', [shift_id], (err, shift) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        const openingBalance = shift ? shift.opening_balance : 0;
                        const expectedBalance = openingBalance + totalSalesAmount;
                        
                        // อัพเดทกะ
                        const sql = `UPDATE shifts SET 
                            closed_at = ?, closing_balance = ?, expected_balance = ?, difference = ?, 
                            total_sales_count = ?, total_sales_amount = ?, expenses = ?, cash_drop = ?,
                            status = 'closed', notes = CASE 
                                WHEN notes IS NULL OR notes = '' THEN ? 
                                ELSE notes || ' | ' || ? 
                            END
                            WHERE id = ?`;
                        
                        const params = [
                            new Date().toISOString(),
                            closingData.closing_balance || 0,
                            expectedBalance,
                            closingData.difference || 0,
                            totalSalesCount,
                            totalSalesAmount,
                            closingData.expenses || 0,
                            closingData.cash_drop || 0,
                            closingData.notes || null,
                            closingData.notes || null,
                            shift_id
                        ];
                        
                        this.db.run(sql, params, function(err) {
                            if (err) reject(err);
                            else {
                                resolve({
                                    success: true,
                                    shift_id,
                                    total_sales_count: totalSalesCount,
                                    total_sales_amount: totalSalesAmount,
                                    expected_balance: expectedBalance,
                                    difference: closingData.difference || 0
                                });
                            }
                        });
                    });
                });
            });
        });
    }

    // ============ SALES METHODS ============

    async saveSale(saleData) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                const saleId = 'SALE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
                
                // บันทึกการขาย
                const saleSql = `
                    INSERT INTO sales 
                    (id, shift_id, subtotal, tax, total, payment_method, vat_type, vat_rate, cashier_id, cashier_name, payment_details, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const saleParams = [
                    saleId,
                    saleData.shift_id || null,
                    saleData.subtotal || 0,
                    saleData.tax || 0,
                    saleData.total || 0,
                    saleData.payment_method || 'cash',
                    saleData.vat_type || 'exclude',
                    saleData.vat_rate || 7,
                    saleData.cashier_id || 1,
                    saleData.cashier_name || 'พนักงาน',
                    JSON.stringify(saleData.payment_details || {}),
                    new Date().toISOString()
                ];
                
                this.db.run(saleSql, saleParams, (err) => {
                    if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    const items = saleData.items || [];
                    let itemsProcessed = 0;
                    
                    if (items.length === 0) {
                        this.db.run('COMMIT');
                        resolve({ success: true, saleId });
                        return;
                    }
                    
                    items.forEach((item) => {
                        const itemSql = `
                            INSERT INTO sale_items 
                            (sale_id, product_id, product_name, quantity, price, total_price)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        
                        const itemParams = [
                            saleId,
                            item.id,
                            item.name,
                            item.quantity || 1,
                            item.price || 0,
                            (item.price || 0) * (item.quantity || 1)
                        ];
                        
                        this.db.run(itemSql, itemParams, (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // อัพเดตสต็อกสินค้า
                            const updateSql = `
                                UPDATE products 
                                SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP 
                                WHERE id = ?
                            `;
                            
                            this.db.run(updateSql, [item.quantity || 1, item.id], (err) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                itemsProcessed++;
                                
                                if (itemsProcessed === items.length) {
                                    this.db.run('COMMIT');
                                    resolve({ success: true, saleId });
                                }
                            });
                        });
                    });
                });
            });
        });
    }

    async getSalesHistory(limit = 50, shift_id = null) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT s.*, COUNT(si.id) as item_count
                FROM sales s
                LEFT JOIN sale_items si ON s.id = si.sale_id
            `;
            
            let params = [];
            
            if (shift_id) {
                sql += ` WHERE s.shift_id = ?`;
                params.push(shift_id);
            }
            
            sql += ` GROUP BY s.id ORDER BY s.created_at DESC LIMIT ?`;
            params.push(limit);
            
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // ============ REPORT METHODS ============

    async getClosedShifts(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    s.*,
                    COALESCE(SUM(CASE WHEN sa.payment_method = 'cash' THEN sa.total ELSE 0 END), 0) as cash_sales,
                    COALESCE(SUM(CASE WHEN sa.payment_method = 'transfer' THEN sa.total ELSE 0 END), 0) as transfer_sales,
                    COALESCE(SUM(CASE WHEN sa.payment_method = 'card' THEN sa.total ELSE 0 END), 0) as card_sales,
                    COALESCE(SUM(CASE WHEN sa.payment_method = 'qr' THEN sa.total ELSE 0 END), 0) as qr_sales,
                    COUNT(DISTINCT sa.id) as actual_sales_count,
                    COALESCE(SUM(sa.total), 0) as actual_sales_amount
                FROM shifts s
                LEFT JOIN sales sa ON s.id = sa.shift_id
                WHERE s.status = 'closed' 
                    AND date(s.closed_at) BETWEEN date(?) AND date(?)
                GROUP BY s.id
                ORDER BY s.closed_at DESC
            `;
            
            this.db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting closed shifts:', err);
                    reject(err);
                } else {
                    const shifts = (rows || []).map(row => ({
                        ...row,
                        opening_balance: row.opening_balance || 0,
                        closing_balance: row.closing_balance || 0,
                        expected_balance: row.expected_balance || 0,
                        total_sales_amount: row.total_sales_amount || 0,
                        total_sales_count: row.total_sales_count || 0,
                        actual_sales_amount: row.actual_sales_amount || 0,
                        actual_sales_count: row.actual_sales_count || 0,
                        cash_sales: row.cash_sales || 0,
                        transfer_sales: row.transfer_sales || 0,
                        card_sales: row.card_sales || 0,
                        qr_sales: row.qr_sales || 0,
                        expenses: row.expenses || 0,
                        cash_drop: row.cash_drop || 0,
                        difference: row.difference || 0
                    }));
                    resolve(shifts);
                }
            });
        });
    }

    async getSalesByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    date(created_at) as sale_date,
                    payment_method,
                    COUNT(*) as bill_count,
                    SUM(total) as total_amount,
                    SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_amount,
                    SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END) as transfer_amount,
                    SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_amount,
                    SUM(CASE WHEN payment_method = 'qr' THEN total ELSE 0 END) as qr_amount
                FROM sales
                WHERE date(created_at) BETWEEN date(?) AND date(?)
                GROUP BY date(created_at), payment_method
                ORDER BY sale_date DESC, payment_method
            `;
            
            this.db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting sales by date range:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getShiftSalesWithItems(shiftId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    s.*,
                    si.id as item_id,
                    si.product_id,
                    si.product_name,
                    si.quantity,
                    si.price as item_price,
                    si.total_price as item_total
                FROM sales s
                LEFT JOIN sale_items si ON s.id = si.sale_id
                WHERE s.shift_id = ?
                ORDER BY s.created_at, si.id
            `;
            
            this.db.all(sql, [shiftId], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting shift sales with items:', err);
                    reject(err);
                } else {
                    const salesMap = new Map();
                    
                    (rows || []).forEach(row => {
                        if (!salesMap.has(row.id)) {
                            salesMap.set(row.id, {
                                id: row.id,
                                shift_id: row.shift_id,
                                subtotal: row.subtotal,
                                tax: row.tax,
                                total: row.total,
                                payment_method: row.payment_method,
                                vat_type: row.vat_type,
                                vat_rate: row.vat_rate,
                                cashier_id: row.cashier_id,
                                cashier_name: row.cashier_name,
                                payment_details: row.payment_details,
                                created_at: row.created_at,
                                items: []
                            });
                        }
                        
                        if (row.item_id) {
                            salesMap.get(row.id).items.push({
                                id: row.item_id,
                                product_id: row.product_id,
                                product_name: row.product_name,
                                quantity: row.quantity,
                                price: row.item_price,
                                total: row.item_total
                            });
                        }
                    });
                    
                    resolve(Array.from(salesMap.values()));
                }
            });
        });
    }

    async getDailySalesSummary(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    date(created_at) as sale_date,
                    COUNT(DISTINCT id) as total_bills,
                    COUNT(DISTINCT shift_id) as total_shifts,
                    SUM(total) as total_sales,
                    AVG(total) as avg_bill_value,
                    SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales,
                    SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END) as transfer_sales,
                    SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_sales,
                    SUM(CASE WHEN payment_method = 'qr' THEN total ELSE 0 END) as qr_sales,
                    COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_bills,
                    COUNT(CASE WHEN payment_method = 'transfer' THEN 1 END) as transfer_bills,
                    COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_bills,
                    COUNT(CASE WHEN payment_method = 'qr' THEN 1 END) as qr_bills
                FROM sales
                WHERE date(created_at) BETWEEN date(?) AND date(?)
                GROUP BY date(created_at)
                ORDER BY sale_date DESC
            `;
            
            this.db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting daily sales summary:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getTopProducts(startDate, endDate, limit = 10) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    si.product_id,
                    si.product_name,
                    p.unit,
                    p.price as current_price,
                    SUM(si.quantity) as total_quantity,
                    SUM(si.total_price) as total_sales,
                    COUNT(DISTINCT s.id) as bill_count,
                    AVG(si.price) as avg_selling_price
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                LEFT JOIN products p ON si.product_id = p.id
                WHERE date(s.created_at) BETWEEN date(?) AND date(?)
                GROUP BY si.product_id, si.product_name
                ORDER BY total_quantity DESC
                LIMIT ?
            `;
            
            this.db.all(sql, [startDate, endDate, limit], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting top products:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getSalesByCashier(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    s.cashier_id,
                    s.cashier_name,
                    COUNT(DISTINCT s.id) as total_bills,
                    COUNT(DISTINCT s.shift_id) as total_shifts,
                    SUM(s.total) as total_sales,
                    AVG(s.total) as avg_bill_value,
                    SUM(CASE WHEN s.payment_method = 'cash' THEN s.total ELSE 0 END) as cash_sales,
                    SUM(CASE WHEN s.payment_method = 'transfer' THEN s.total ELSE 0 END) as transfer_sales,
                    SUM(CASE WHEN s.payment_method = 'card' THEN s.total ELSE 0 END) as card_sales,
                    SUM(CASE WHEN s.payment_method = 'qr' THEN s.total ELSE 0 END) as qr_sales,
                    MIN(s.created_at) as first_sale,
                    MAX(s.created_at) as last_sale
                FROM sales s
                WHERE date(s.created_at) BETWEEN date(?) AND date(?)
                GROUP BY s.cashier_id, s.cashier_name
                ORDER BY total_sales DESC
            `;
            
            this.db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting sales by cashier:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getMonthlySales(year) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    strftime('%m', created_at) as month,
                    COUNT(DISTINCT id) as total_bills,
                    COUNT(DISTINCT shift_id) as total_shifts,
                    SUM(total) as total_sales,
                    AVG(total) as avg_bill_value,
                    SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales,
                    SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END) as transfer_sales,
                    SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_sales,
                    SUM(CASE WHEN payment_method = 'qr' THEN total ELSE 0 END) as qr_sales
                FROM sales
                WHERE strftime('%Y', created_at) = ?
                GROUP BY strftime('%m', created_at)
                ORDER BY month
            `;
            
            this.db.all(sql, [year.toString()], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting monthly sales:', err);
                    reject(err);
                } else {
                    const thaiMonths = [
                        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                    ];
                    
                    const monthlyData = (rows || []).map(row => ({
                        ...row,
                        month_name: thaiMonths[parseInt(row.month) - 1] || row.month,
                        month_num: parseInt(row.month)
                    }));
                    
                    resolve(monthlyData);
                }
            });
        });
    }

    async getShiftClosingDetails(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    id,
                    shift_number,
                    cashier_name,
                    opened_at,
                    closed_at,
                    opening_balance,
                    closing_balance,
                    expected_balance,
                    difference,
                    total_sales_count,
                    total_sales_amount,
                    expenses,
                    cash_drop,
                    notes,
                    (closing_balance - cash_drop) as final_balance,
                    (expected_balance - expenses) as adjusted_expected,
                    (closing_balance - cash_drop) - (expected_balance - expenses) as actual_difference,
                    CASE 
                        WHEN ABS(difference) > 10 THEN 'over_limit'
                        WHEN difference = 0 THEN 'exact'
                        ELSE 'within_limit'
                    END as difference_status
                FROM shifts
                WHERE status = 'closed'
                    AND date(closed_at) BETWEEN date(?) AND date(?)
                ORDER BY closed_at DESC
            `;
            
            this.db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting shift closing details:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getDashboardStats() {
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            
            const sql = `
                SELECT
                    -- ยอดขายวันนี้
                    (SELECT COALESCE(SUM(total), 0) FROM sales WHERE date(created_at) = date(?)) as today_sales,
                    (SELECT COUNT(*) FROM sales WHERE date(created_at) = date(?)) as today_bills,
                    
                    -- ยอดขายเดือนนี้
                    (SELECT COALESCE(SUM(total), 0) FROM sales WHERE date(created_at) >= date(?)) as month_sales,
                    (SELECT COUNT(*) FROM sales WHERE date(created_at) >= date(?)) as month_bills,
                    
                    -- จำนวนกะที่เปิดวันนี้
                    (SELECT COUNT(*) FROM shifts WHERE date(opened_at) = date(?) AND status = 'open') as open_shifts_today,
                    
                    -- จำนวนกะที่ปิดวันนี้
                    (SELECT COUNT(*) FROM shifts WHERE date(closed_at) = date(?) AND status = 'closed') as closed_shifts_today,
                    
                    -- สินค้าคงเหลือ
                    (SELECT COUNT(*) FROM products WHERE stock > 0) as products_in_stock,
                    (SELECT COUNT(*) FROM products WHERE stock = 0) as out_of_stock,
                    (SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= min_stock) as low_stock,
                    
                    -- มูลค่าสต็อก
                    (SELECT COALESCE(SUM(price * stock), 0) FROM products) as stock_value,
                    
                    -- จำนวน suppliers
                    (SELECT COUNT(*) FROM suppliers) as total_suppliers
            `;
            
            this.db.get(sql, [today, today, firstDayOfMonth, firstDayOfMonth, today, today], (err, row) => {
                if (err) {
                    console.error('❌ Error getting dashboard stats:', err);
                    reject(err);
                } else {
                    resolve(row || {
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
                    });
                }
            });
        });
    }

    async getHourlySalesToday() {
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            
            const sql = `
                SELECT 
                    strftime('%H', created_at) as hour,
                    COUNT(*) as bill_count,
                    COALESCE(SUM(total), 0) as total_sales
                FROM sales
                WHERE date(created_at) = date(?)
                GROUP BY strftime('%H', created_at)
                ORDER BY hour
            `;
            
            this.db.all(sql, [today], (err, rows) => {
                if (err) {
                    console.error('❌ Error getting hourly sales:', err);
                    reject(err);
                } else {
                    const hourlyData = [];
                    for (let i = 0; i < 24; i++) {
                        const hour = i.toString().padStart(2, '0');
                        const existing = (rows || []).find(r => r.hour === hour);
                        hourlyData.push({
                            hour: hour,
                            bill_count: existing ? existing.bill_count : 0,
                            total_sales: existing ? existing.total_sales : 0
                        });
                    }
                    resolve(hourlyData);
                }
            });
        });
    }

    // ============ CLOSE DATABASE ============

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('🔒 Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// สร้าง instance เดียว
const database = new Database();

module.exports = database;