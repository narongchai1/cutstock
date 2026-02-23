// database.js - Complete version for Electron with SQLite
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class Database {
    constructor() {
        // ใช้ userData directory ของ Electron
        const userDataPath = app.getPath('userData');
        const dataDir = path.join(userDataPath, 'data');
        
        // สร้างโฟลเดอร์ data ถ้ายังไม่มี
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.dbPath = path.join(dataDir, 'stock.db');
        console.log('📁 Database path:', this.dbPath);
        
        // ใช้ sqlite3
        const sqlite3 = require('sqlite3');
        this.db = new sqlite3.Database(this.dbPath);
        
        this.initPromise = this.initDatabase();
    }
    
    async initDatabase() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                try {
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
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating products table:', err);
                            reject(err);
                            return;
                        }
                        
                        // ตาราง product_lots
                        this.db.run(`CREATE TABLE IF NOT EXISTS product_lots (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            product_id TEXT NOT NULL,
                            lot_number TEXT,
                            expiry_date DATE,
                            quantity INTEGER DEFAULT 0,
                            supplier_code TEXT,
                            received_date DATE DEFAULT CURRENT_DATE,
                            warranty TEXT,
                            cost REAL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
                        )`, (err) => {
                            if (err) {
                                console.error('Error creating product_lots table:', err);
                                reject(err);
                                return;
                            }
                            
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
                            )`, async (err) => {
                                if (err) {
                                    console.error('Error creating users table:', err);
                                    reject(err);
                                    return;
                                }
                                
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
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                )`, (err) => {
                                    if (err) {
                                        console.error('Error creating sales table:', err);
                                        reject(err);
                                        return;
                                    }
                                    
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
                                    )`, (err) => {
                                        if (err) {
                                            console.error('Error creating sale_items table:', err);
                                            reject(err);
                                            return;
                                        }
                                        
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
                                        )`, (err) => {
                                            if (err) {
                                                console.error('Error creating shifts table:', err);
                                                reject(err);
                                                return;
                                            }
                                            
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
                                            )`, (err) => {
                                                if (err) {
                                                    console.error('Error creating suppliers table:', err);
                                                    reject(err);
                                                    return;
                                                }
                                                
                                                // ตรวจสอบและสร้างข้อมูลเริ่มต้น
                                                this.checkAndCreateInitialData();
                                                console.log('✅ Database initialized successfully');
                                                resolve();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                } catch (error) {
                    console.error('Error in initDatabase:', error);
                    reject(error);
                }
            });
        });
    }
    
    async checkAndCreateInitialData() {
        return new Promise((resolve) => {
            // ตรวจสอบและสร้าง users
            this.db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
                if (err) {
                    console.error('Error checking users:', err);
                    resolve();
                    return;
                }
                
                if (row.count === 0) {
                    await this.createDefaultUsers();
                }
                
                // ตรวจสอบและสร้าง products
                this.db.get('SELECT COUNT(*) as count FROM products', async (err, row) => {
                    if (err) {
                        console.error('Error checking products:', err);
                        resolve();
                        return;
                    }
                    
                    if (row.count === 0) {
                        await this.createSampleProducts();
                    }
                    
                    // ตรวจสอบและสร้าง suppliers
                    this.db.get('SELECT COUNT(*) as count FROM suppliers', async (err, row) => {
                        if (err) {
                            console.error('Error checking suppliers:', err);
                            resolve();
                            return;
                        }
                        
                        if (row.count === 0) {
                            await this.createSampleSuppliers();
                        }
                        
                        resolve();
                    });
                });
            });
        });
    }
    
    async createDefaultUsers() {
        const users = [
            { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ', role: 'admin', email: 'admin@example.com', phone: '0812345678' },
            { username: 'manager', password: 'manager123', name: 'ผู้จัดการ', role: 'admin', email: 'manager@example.com', phone: '0823456789' },
            { username: 'staff1', password: 'staff123', name: 'พนักงานขาย 1', role: 'staff', email: 'staff1@example.com', phone: '0834567890' },
            { username: 'staff2', password: 'staff456', name: 'พนักงานขาย 2', role: 'staff', email: 'staff2@example.com', phone: '0845678901' }
        ];
        
        for (const user of users) {
            try {
                await this.createUser(user);
                console.log(`✅ Created user: ${user.username} (${user.role})`);
            } catch (error) {
                console.error(`❌ Error creating user ${user.username}:`, error);
            }
        }
    }
    
    async createSampleSuppliers() {
        const suppliers = [
            {
                code: 'SUP-001',
                name: 'บริษัท ไทย-เดนมาร์ค จำกัด',
                contact_person: 'สมชาย ใจดี',
                phone: '02-123-4567',
                email: 'contact@thai-denmark.com',
                address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
                tax_id: '0105556123456'
            },
            {
                code: 'SUP-002',
                name: 'บริษัท ซีฟู้ด ผลิตภัณฑ์อาหารทะเล จำกัด',
                contact_person: 'สมหญิง เก่งงาน',
                phone: '02-234-5678',
                email: 'info@seafood.co.th',
                address: '456 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
                tax_id: '0105556234567'
            },
            {
                code: 'SUP-003',
                name: 'บริษัท คอลเกต-ปาล์มโอลีฟ จำกัด',
                contact_person: 'ธนพล ทำงานดี',
                phone: '02-345-6789',
                email: 'thailand@colgate.com',
                address: '789 ถนนพระราม 4 แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
                tax_id: '0105556345678'
            },
            {
                code: 'SUP-004',
                name: 'บริษัท พานาโซนิค ประเทศไทย จำกัด',
                contact_person: 'วิษณุ เทคโนโลยี',
                phone: '02-456-7890',
                email: 'support@panasonic.co.th',
                address: '321 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900',
                tax_id: '0105556456789'
            }
        ];
        
        for (const supplier of suppliers) {
            try {
                await this.createSupplier(supplier);
                console.log(`✅ Created supplier: ${supplier.code} - ${supplier.name}`);
            } catch (error) {
                console.error(`❌ Error creating supplier ${supplier.code}:`, error);
            }
        }
    }
    
    async createSampleProducts() {
        const products = [
            {
                id: 'P001',
                barcode: '8901234567890',
                name: 'เมาส์เกมมิ่ง RGB',
                description: 'เมาส์เกมมิ่งที่มีไฟ RGB พร้อมปุ่มโปรแกรมได้',
                price: 599,
                cost: 350,
                stock: 50,
                min_stock: 10,
                max_stock: 100,
                unit: 'ชิ้น',
                category: 'อิเล็กทรอนิกส์',
                subcategory: 'อุปกรณ์ต่อพ่วง'
            },
            {
                id: 'P002',
                barcode: '8901234567891',
                name: 'คีย์บอร์ด Mechanical',
                description: 'คีย์บอร์ด Mechanical Switch',
                price: 1299,
                cost: 800,
                stock: 25,
                min_stock: 5,
                max_stock: 50,
                unit: 'ชิ้น',
                category: 'อิเล็กทรอนิกส์',
                subcategory: 'อุปกรณ์ต่อพ่วง'
            },
            {
                id: 'P003',
                barcode: '8901234567892',
                name: 'นมสดยูเอชที',
                description: 'นมสดยูเอชที รสจืด 200ml',
                price: 25,
                cost: 18.50,
                stock: 150,
                min_stock: 30,
                max_stock: 300,
                unit: 'กล่อง',
                category: 'เครื่องดื่ม',
                subcategory: 'นม'
            },
            {
                id: 'P004',
                barcode: '8901234567893',
                name: 'น้ำปลาแท่ง ซีฟู้ด',
                description: 'น้ำปลาแท่ง ซีฟู้ด 200ml',
                price: 45,
                cost: 32,
                stock: 80,
                min_stock: 20,
                max_stock: 150,
                unit: 'ขวด',
                category: 'อาหารแห้ง',
                subcategory: 'เครื่องปรุงรส'
            },
            {
                id: 'P005',
                barcode: '8901234567894',
                name: 'ยาสีฟันคอลเกต',
                description: 'ยาสีฟันคอลเกต สูตรสมุนไพร',
                price: 89,
                cost: 65,
                stock: 35,
                min_stock: 10,
                max_stock: 80,
                unit: 'หลอด',
                category: 'สุขภาพและความงาม',
                subcategory: 'ผลิตภัณฑ์ทำความสะอาดช่องปาก'
            }
        ];
        
        for (const product of products) {
            try {
                await this.saveProduct(product);
                
                // เพิ่มล็อตสินค้า
                await this.addProductLot({
                    product_id: product.id,
                    lot_number: `LOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    quantity: product.stock,
                    supplier_code: 'SUP-001',
                    received_date: new Date().toISOString().split('T')[0],
                    warranty: '6 เดือน',
                    cost: product.cost
                });
                
                console.log(`✅ Created product: ${product.name}`);
            } catch (error) {
                console.error(`❌ Error creating product ${product.name}:`, error);
            }
        }
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
                    const sql = `UPDATE products SET 
                        barcode = ?, 
                        name = ?, 
                        description = ?, 
                        price = ?, 
                        cost = ?, 
                        stock = ?, 
                        min_stock = ?, 
                        max_stock = ?, 
                        unit = ?,
                        category = ?, 
                        subcategory = ?, 
                        status = ?, 
                        updated_at = ?
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
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                success: true,
                                action: 'update',
                                changes: this.changes,
                                product: productData
                            });
                        }
                    });
                } else {
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
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                success: true,
                                action: 'insert',
                                lastID: this.lastID,
                                product: productData
                            });
                        }
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
                if (err) {
                    console.error('Error getting product:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    async deleteProduct(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Error deleting product:', err);
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        deleted: this.changes > 0,
                        changes: this.changes
                    });
                }
            });
        });
    }
    
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO users (username, password, name, role, email, phone) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
            
            const params = [
                userData.username,
                userData.password,
                userData.name,
                userData.role || 'staff',
                userData.email || null,
                userData.phone || null
            ];
            
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        ...userData
                    });
                }
            });
        });
    }
    
    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
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
                if (err) {
                    console.error('Error getting statistics:', err);
                    reject(err);
                } else {
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
                if (err) {
                    console.error('Error getting categories:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    // ============ PRODUCT LOTS METHODS ============
    
    async addProductLot(lotData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO product_lots 
                        (product_id, lot_number, expiry_date, quantity, supplier_code, received_date, warranty, cost)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const params = [
                lotData.product_id,
                lotData.lot_number || `LOT-${Date.now()}`,
                lotData.expiry_date,
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
                    resolve({
                        success: true,
                        id: this.lastID
                    });
                }
            });
        });
    }
    
    async getProductLots(productId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM product_lots WHERE product_id = ? ORDER BY expiry_date';
            this.db.all(sql, [productId], (err, rows) => {
                if (err) {
                    console.error('Error getting product lots:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
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
                if (err) {
                    console.error('Error creating supplier:', err);
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        code: supplierData.code
                    });
                }
            });
        });
    }
    
    async getSupplier(code) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM suppliers WHERE code = ?', [code], (err, row) => {
                if (err) {
                    console.error('Error getting supplier:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    async getAllSuppliers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM suppliers ORDER BY name', (err, rows) => {
                if (err) {
                    console.error('Error getting suppliers:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
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
                if (err) {
                    console.error('Error opening shift:', err);
                    reject(err);
                } else {
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
                if (err) {
                    console.error('Error getting current shift:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    async getShiftById(shift_id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM shifts WHERE id = ?';
            this.db.get(sql, [shift_id], (err, row) => {
                if (err) {
                    console.error('Error getting shift by id:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    async getShiftSales(shift_id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM sales WHERE shift_id = ? ORDER BY created_at';
            this.db.all(sql, [shift_id], (err, rows) => {
                if (err) {
                    console.error('Error getting shift sales:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    async closeShift(shift_id, closingData) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // ดึงข้อมูลการขายในกะนี้
                this.db.all('SELECT * FROM sales WHERE shift_id = ?', [shift_id], (err, sales) => {
                    if (err) {
                        console.error('Error getting sales for shift:', err);
                        reject(err);
                        return;
                    }
                    
                    const totalSalesCount = sales.length;
                    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
                    
                    // ดึงข้อมูลกะ
                    this.db.get('SELECT opening_balance FROM shifts WHERE id = ?', [shift_id], (err, shift) => {
                        if (err) {
                            console.error('Error getting shift data:', err);
                            reject(err);
                            return;
                        }
                        
                        const openingBalance = shift ? shift.opening_balance : 0;
                        const expectedBalance = openingBalance + totalSalesAmount;
                        
                        // อัพเดทกะ
                        const sql = `UPDATE shifts SET 
                            closed_at = ?, 
                            closing_balance = ?, 
                            expected_balance = ?, 
                            difference = ?, 
                            total_sales_count = ?, 
                            total_sales_amount = ?, 
                            expenses = ?,
                            cash_drop = ?,
                            status = 'closed', 
                            notes = CASE 
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
                            if (err) {
                                console.error('Error closing shift:', err);
                                reject(err);
                            } else {
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
                        console.error('Error inserting sale:', err);
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
                                console.error('Error inserting sale item:', err);
                                reject(err);
                                return;
                            }
                            
                            // อัพเดตสต็อกสินค้า
                            const updateSql = `
                                UPDATE products 
                                SET stock = stock - ?, 
                                    updated_at = CURRENT_TIMESTAMP 
                                WHERE id = ?
                            `;
                            
                            this.db.run(updateSql, [item.quantity || 1, item.id], (err) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    console.error('Error updating product stock:', err);
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
                SELECT s.*, 
                       COUNT(si.id) as item_count
                FROM sales s
                LEFT JOIN sale_items si ON s.id = si.sale_id
            `;
            
            let params = [];
            
            if (shift_id) {
                sql += ` WHERE s.shift_id = ?`;
                params.push(shift_id);
            }
            
            sql += ` GROUP BY s.id
                     ORDER BY s.created_at DESC
                     LIMIT ?`;
            
            params.push(limit);
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Error getting sales history:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    async getSalesReport(startDate, endDate, shift_id = null) {
        return new Promise((resolve, reject) => {
            // ดึงข้อมูลการขายในช่วงวันที่
            let salesSql = `
                SELECT * FROM sales 
                WHERE date(created_at) BETWEEN date(?) AND date(?)
            `;
            
            let params = [startDate, endDate];
            
            if (shift_id) {
                salesSql += ` AND shift_id = ?`;
                params.push(shift_id);
            }
            
            salesSql += ` ORDER BY created_at DESC`;
            
            this.db.all(salesSql, params, (err, sales) => {
                if (err) {
                    console.error('Error getting sales report:', err);
                    reject(err);
                    return;
                }
                
                // ดึงรายการสินค้าที่ขาย
                let itemsSql = `
                    SELECT si.*, p.category 
                    FROM sale_items si
                    LEFT JOIN products p ON si.product_id = p.id
                    WHERE si.sale_id IN (
                        SELECT id FROM sales 
                        WHERE date(created_at) BETWEEN date(?) AND date(?)
                `;
                
                let itemsParams = [startDate, endDate];
                
                if (shift_id) {
                    itemsSql += ` AND shift_id = ?`;
                    itemsParams.push(shift_id);
                }
                
                itemsSql += `)`;
                
                this.db.all(itemsSql, itemsParams, (err, items) => {
                    if (err) {
                        console.error('Error getting sale items:', err);
                        reject(err);
                        return;
                    }
                    
                    // คำนวณสถิติ
                    const total_sales = (sales || []).reduce((sum, sale) => sum + (sale.total || 0), 0);
                    const sale_count = (sales || []).length;
                    const items_sold = (items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                    
                    // นับตามช่องทางการชำระเงิน
                    const payment_methods = {};
                    (sales || []).forEach(sale => {
                        const method = sale.payment_method || 'cash';
                        payment_methods[method] = (payment_methods[method] || 0) + 1;
                    });
                    
                    resolve({
                        sales: sales || [],
                        items: items || [],
                        total_sales,
                        sale_count,
                        items_sold,
                        payment_methods
                    });
                });
            });
        });
    }
    
    async getTopProducts(limit = 10, startDate, endDate) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    si.product_id,
                    si.product_name,
                    SUM(si.quantity) as total_quantity,
                    SUM(si.total_price) as total_revenue,
                    COUNT(DISTINCT si.sale_id) as sale_count
                FROM sale_items si
            `;
            
            let params = [];
            
            if (startDate && endDate) {
                sql += ` WHERE si.sale_id IN (
                    SELECT id FROM sales 
                    WHERE date(created_at) BETWEEN date(?) AND date(?)
                )`;
                params = [startDate, endDate];
            }
            
            sql += ` GROUP BY si.product_id, si.product_name
                     ORDER BY total_quantity DESC
                     LIMIT ?`;
            
            params.push(limit);
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Error getting top products:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    close() {
        if (this.db) {
            this.db.close();
            console.log('🔒 Database connection closed');
        }
    }
}

// สร้าง instance เดียวสำหรับทั้งแอพ
const database = new Database();

module.exports = database;