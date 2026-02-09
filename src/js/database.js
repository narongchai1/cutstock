// database.js - Fixed SQLite Version
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        const dataDir = path.join(__dirname, '../../data');
        this.dbPath = path.join(dataDir, 'stock.db');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.db = null;
        this.ready = false;
        this.initPromise = this.initDatabase();
    }
    
    // ฟังก์ชันสำหรับรอให้ database พร้อม
    async waitForReady() {
        if (!this.initPromise) {
            this.initPromise = this.initDatabase();
        }
        await this.initPromise;
        this.ready = true;
    }
    
    // ตรวจสอบว่า database พร้อมใช้งาน
    async ensureReady() {
        if (!this.ready) {
            await this.waitForReady();
        }
    }
    
    initDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database at:', this.dbPath);
                
                // ตั้งค่า database
                this.db.serialize(() => {
                    this.db.run('PRAGMA journal_mode = WAL');
                    this.db.run('PRAGMA foreign_keys = ON');
                    this.db.run('PRAGMA busy_timeout = 5000');
                    
                    this.createTables()
                        .then(() => {
                            console.log('Tables created successfully');
                            this.ready = true;
                            resolve();
                        })
                        .catch(err => {
                            console.error('Error creating tables:', err);
                            reject(err);
                        });
                });
            });
        });
    }
    
    async createTables() {
        return new Promise((resolve, reject) => {
            try {
                // ตาราง suppliers
                const createSuppliersTable = `
                    CREATE TABLE IF NOT EXISTS suppliers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        supplier_code TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        contact_person TEXT,
                        phone TEXT,
                        email TEXT,
                        address TEXT,
                        tax_id TEXT,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                // ตาราง products
                const createProductsTable = `
                    CREATE TABLE IF NOT EXISTS products (
                        id TEXT PRIMARY KEY,
                        barcode TEXT UNIQUE,
                        name TEXT NOT NULL,
                        description TEXT,
                        price REAL NOT NULL DEFAULT 0,
                        cost REAL NOT NULL DEFAULT 0,
                        min_stock INTEGER DEFAULT 10,
                        max_stock INTEGER DEFAULT 100,
                        unit TEXT DEFAULT 'ชิ้น',
                        category TEXT,
                        subcategory TEXT,
                        status TEXT DEFAULT 'active',
                        supplier_id INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
                    )
                `;
                
                // ตาราง product_lots
                const createProductLotsTable = `
                    CREATE TABLE IF NOT EXISTS product_lots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        lot_number TEXT UNIQUE NOT NULL,
                        product_id TEXT NOT NULL,
                        manufacturing_date DATE,
                        expiration_date DATE NOT NULL,
                        batch_number TEXT,
                        quantity INTEGER NOT NULL DEFAULT 0,
                        remaining_quantity INTEGER NOT NULL DEFAULT 0,
                        warranty_period INTEGER,
                        warranty_info TEXT,
                        supplier_id INTEGER NOT NULL,
                        purchase_price REAL,
                        received_date DATE DEFAULT CURRENT_DATE,
                        storage_location TEXT,
                        notes TEXT,
                        status TEXT DEFAULT 'in_stock',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (product_id) REFERENCES products (id),
                        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
                    )
                `;
                
                // ตาราง users
                const createUsersTable = `
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        name TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'staff',
                        email TEXT,
                        phone TEXT,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                // รันคำสั่งสร้างตารางทั้งหมด
                this.db.serialize(() => {
                    this.db.run(createSuppliersTable);
                    this.db.run(createProductsTable);
                    this.db.run(createProductLotsTable);
                    this.db.run(createUsersTable, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        // เพิ่มข้อมูลเริ่มต้น
                        this.initializeDefaultData()
                            .then(() => resolve())
                            .catch(err => {
                                console.error('Error initializing default data:', err);
                                resolve(); // ยัง resolve เพราะตารางถูกสร้างแล้ว
                            });
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async initializeDefaultData() {
        try {
            await this.ensureReady();
            
            // ตรวจสอบว่ามีผู้ใช้ admin หรือยัง
            let adminExists;
            try {
                adminExists = await this.getUserByUsername('admin');
            } catch (error) {
                adminExists = null;
            }
            
            if (!adminExists) {
                await this.createUser({
                    username: 'admin',
                    password: 'admin123',
                    name: 'ผู้ดูแลระบบ',
                    role: 'admin',
                    email: 'admin@example.com',
                    phone: '0812345678'
                });
                console.log('Created admin user');
            }
            
            // ตรวจสอบว่ามีผู้ใช้ staff หรือยัง
            let staffExists;
            try {
                staffExists = await this.getUserByUsername('staff');
            } catch (error) {
                staffExists = null;
            }
            
            if (!staffExists) {
                await this.createUser({
                    username: 'staff',
                    password: 'staff123',
                    name: 'พนักงาน',
                    role: 'staff',
                    email: 'staff@example.com',
                    phone: '0898765432'
                });
                console.log('Created staff user');
            }
            
            // ตรวจสอบว่ามีซัพพลายเออร์ตัวอย่างหรือยัง
            let supplierCount;
            try {
                supplierCount = await this.getSupplierCount();
            } catch (error) {
                supplierCount = 0;
            }
            
            if (supplierCount === 0) {
                await this.initializeSampleSuppliers();
                console.log('Created sample suppliers');
            }
            
            // ตรวจสอบว่ามีสินค้าตัวอย่างหรือยัง
            let productCount;
            try {
                productCount = await this.getProductCount();
            } catch (error) {
                productCount = 0;
            }
            
            if (productCount === 0) {
                await this.initializeSampleProducts();
                console.log('Created sample products');
            }
        } catch (error) {
            console.error('Error in initializeDefaultData:', error);
        }
    }
    
    async initializeSampleSuppliers() {
        const sampleSuppliers = [
            {
                supplier_code: 'SUP001',
                name: 'บริษัท เทคโนโลยี จำกัด',
                contact_person: 'คุณสมชาย ใจดี',
                phone: '02-123-4567',
                email: 'contact@techcompany.com',
                address: '123 ถนนรัชดา กรุงเทพ 10310',
                tax_id: '0123456789012',
                status: 'active'
            }
        ];
        
        for (const supplier of sampleSuppliers) {
            try {
                await this.createSupplier(supplier);
            } catch (error) {
                console.error('Error creating sample supplier:', error);
            }
        }
    }
    
    async initializeSampleProducts() {
        const sampleProducts = [
            {
                id: 'P001',
                barcode: '8901234567890',
                name: 'เมาส์เกมมิ่ง RGB',
                description: 'เมาส์เกมมิ่งที่มีไฟ RGB พร้อมปุ่มโปรแกรมได้',
                price: 599,
                cost: 350,
                min_stock: 5,
                max_stock: 50,
                unit: 'ชิ้น',
                category: 'คอมพิวเตอร์',
                subcategory: 'อุปกรณ์ต่อพ่วง',
                supplier_id: 1
            },
            {
                id: 'P002',
                barcode: '8901234567891',
                name: 'คีย์บอร์ด Mechanical',
                description: 'คีย์บอร์ด Mechanical Switch',
                price: 1299,
                cost: 800,
                min_stock: 3,
                max_stock: 30,
                unit: 'ชิ้น',
                category: 'คอมพิวเตอร์',
                subcategory: 'อุปกรณ์ต่อพ่วง',
                supplier_id: 1
            }
        ];
        
        for (const product of sampleProducts) {
            try {
                await this.saveProduct(product);
            } catch (error) {
                console.error('Error creating sample product:', error);
            }
        }
    }
    
    // === UTILITY METHODS ===
    
    async executeQuery(sql, params = []) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Query error:', err);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }
    
    async fetchQuery(sql, params = []) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Fetch error:', err);
                    console.error('SQL:', sql);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    async fetchOne(sql, params = []) {
        await this.ensureReady();
        
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Fetch one error:', err);
                    console.error('SQL:', sql);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    // === USER METHODS ===
    
    async createUser(userData) {
        await this.ensureReady();
        
        const sql = `INSERT INTO users (username, password, name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            userData.username,
            userData.password,
            userData.name,
            userData.role || 'staff',
            userData.email || null,
            userData.phone || null
        ];
        
        try {
            const result = await this.executeQuery(sql, params);
            return {
                id: result.lastID,
                ...userData,
                password: undefined // ไม่ส่ง password กลับ
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    
    async getUserByUsername(username) {
        await this.ensureReady();
        
        const sql = `SELECT * FROM users WHERE username = ?`;
        return this.fetchOne(sql, [username]);
    }
    
    async authenticate(username, password) {
        try {
            await this.ensureReady();
            
            const user = await this.getUserByUsername(username);
            
            if (!user) {
                return { success: false, message: 'ไม่พบชื่อผู้ใช้' };
            }
            
            if (user.password !== password) {
                return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
            }
            
            // ไม่ส่ง password กลับ
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
    
    // === SUPPLIER METHODS ===
    
    async createSupplier(supplierData) {
        await this.ensureReady();
        
        const sql = `INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, address, tax_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            supplierData.supplier_code,
            supplierData.name,
            supplierData.contact_person || null,
            supplierData.phone || null,
            supplierData.email || null,
            supplierData.address || null,
            supplierData.tax_id || null
        ];
        
        try {
            const result = await this.executeQuery(sql, params);
            return {
                id: result.lastID,
                ...supplierData
            };
        } catch (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }
    }
    
    async getSuppliers() {
        await this.ensureReady();
        
        const sql = `SELECT * FROM suppliers ORDER BY name`;
        return this.fetchQuery(sql);
    }
    
    async getSupplierCount() {
        await this.ensureReady();
        
        const sql = `SELECT COUNT(*) as count FROM suppliers`;
        const result = await this.fetchOne(sql);
        return result ? result.count : 0;
    }
    
    async getSupplierById(id) {
        await this.ensureReady();
        
        const sql = `SELECT * FROM suppliers WHERE id = ?`;
        return this.fetchOne(sql, [id]);
    }
    
    // === PRODUCT METHODS ===
    
    async saveProduct(productData) {
        await this.ensureReady();
        
        try {
            // ตรวจสอบว่าสินค้ามีอยู่แล้วหรือไม่
            const existing = await this.getProductById(productData.id);
            
            if (existing) {
                // อัพเดทสินค้าที่มีอยู่
                return await this.updateProduct(productData);
            } else {
                // เพิ่มสินค้าใหม่
                return await this.insertProduct(productData);
            }
        } catch (error) {
            console.error('Error in saveProduct:', error);
            throw error;
        }
    }
    
    async insertProduct(product) {
        await this.ensureReady();
        
        const sql = `
            INSERT INTO products 
            (id, barcode, name, description, price, cost, min_stock, max_stock, unit, 
             category, subcategory, supplier_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            product.id,
            product.barcode || null,
            product.name,
            product.description || null,
            product.price || 0,
            product.cost || 0,
            product.min_stock || 10,
            product.max_stock || 100,
            product.unit || 'ชิ้น',
            product.category || null,
            product.subcategory || null,
            product.supplier_id || null
        ];
        
        try {
            const result = await this.executeQuery(sql, params);
            console.log(`Product inserted: ${product.id}`);
            
            return {
                success: true,
                action: 'insert',
                product: product,
                lastID: result.lastID,
                changes: result.changes
            };
        } catch (error) {
            console.error('Error inserting product:', error);
            throw error;
        }
    }
    
    async updateProduct(product) {
        await this.ensureReady();
        
        const sql = `
            UPDATE products 
            SET barcode = ?, name = ?, description = ?, price = ?, cost = ?, 
                min_stock = ?, max_stock = ?, unit = ?, category = ?, subcategory = ?,
                supplier_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            product.barcode || null,
            product.name,
            product.description || null,
            product.price || 0,
            product.cost || 0,
            product.min_stock || 10,
            product.max_stock || 100,
            product.unit || 'ชิ้น',
            product.category || null,
            product.subcategory || null,
            product.supplier_id || null,
            product.id
        ];
        
        try {
            const result = await this.executeQuery(sql, params);
            console.log(`Product updated: ${product.id}, changes: ${result.changes}`);
            
            return {
                success: true,
                action: 'update',
                product: product,
                changes: result.changes
            };
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }
    
    async getProducts(searchTerm = '', category = '') {
        await this.ensureReady();
        
        let sql = `SELECT * FROM products`;
        let params = [];
        
        if (searchTerm || category) {
            const conditions = [];
            
            if (searchTerm) {
                conditions.push(`(id LIKE ? OR barcode LIKE ? OR name LIKE ?)`);
                const searchParam = `%${searchTerm}%`;
                params.push(searchParam, searchParam, searchParam);
            }
            
            if (category) {
                conditions.push(`category = ?`);
                params.push(category);
            }
            
            if (conditions.length > 0) {
                sql += ` WHERE ` + conditions.join(' AND ');
            }
        }
        
        sql += ` ORDER BY created_at DESC`;
        
        return this.fetchQuery(sql, params);
    }
    
    async getProductById(id) {
        await this.ensureReady();
        
        const sql = `SELECT * FROM products WHERE id = ?`;
        return this.fetchOne(sql, [id]);
    }
    
    async deleteProduct(id) {
        await this.ensureReady();
        
        const sql = `DELETE FROM products WHERE id = ?`;
        
        try {
            const result = await this.executeQuery(sql, [id]);
            return {
                success: true,
                deleted: result.changes > 0,
                changes: result.changes
            };
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
    
    async getProductCount() {
        await this.ensureReady();
        
        const sql = `SELECT COUNT(*) as count FROM products`;
        const result = await this.fetchOne(sql);
        return result ? result.count : 0;
    }
    
    // === PRODUCT LOT METHODS ===
    
    async addProductLot(lotData) {
        await this.ensureReady();
        
        const sql = `
            INSERT INTO product_lots 
            (lot_number, product_id, manufacturing_date, expiration_date, batch_number,
             quantity, remaining_quantity, warranty_period, warranty_info, supplier_id,
             purchase_price, storage_location, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            lotData.lot_number,
            lotData.product_id,
            lotData.manufacturing_date || null,
            lotData.expiration_date,
            lotData.batch_number || null,
            lotData.quantity || 0,
            lotData.remaining_quantity || lotData.quantity || 0,
            lotData.warranty_period || null,
            lotData.warranty_info || null,
            lotData.supplier_id,
            lotData.purchase_price || null,
            lotData.storage_location || null,
            lotData.notes || null,
            lotData.status || 'in_stock'
        ];
        
        try {
            const result = await this.executeQuery(sql, params);
            console.log(`Product lot added: ${lotData.lot_number}`);
            
            return {
                id: result.lastID,
                ...lotData
            };
        } catch (error) {
            console.error('Error adding product lot:', error);
            throw error;
        }
    }
    
    async getProductLots(productId = null, supplierId = null) {
        await this.ensureReady();
        
        let sql = `SELECT * FROM product_lots`;
        let params = [];
        
        if (productId || supplierId) {
            const conditions = [];
            
            if (productId) {
                conditions.push(`product_id = ?`);
                params.push(productId);
            }
            
            if (supplierId) {
                conditions.push(`supplier_id = ?`);
                params.push(supplierId);
            }
            
            if (conditions.length > 0) {
                sql += ` WHERE ` + conditions.join(' AND ');
            }
        }
        
        sql += ` ORDER BY expiration_date ASC`;
        
        return this.fetchQuery(sql, params);
    }
    
    // === STATISTICS METHODS ===
    
    async getStockStatistics() {
        await this.ensureReady();
        
        const sql = `
            SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_stock,
                SUM(price * stock) as total_value,
                SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(CASE WHEN stock > 0 AND stock <= 10 THEN 1 ELSE 0 END) as low_stock
            FROM products
        `;
        
        const result = await this.fetchOne(sql);
        return result || {
            total_products: 0,
            total_stock: 0,
            total_value: 0,
            out_of_stock: 0,
            low_stock: 0
        };
    }
    
    // === TEST METHODS ===
    
    async testConnection() {
        try {
            await this.ensureReady();
            const result = await this.fetchOne('SELECT 1 as test');
            return result && result.test === 1;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
    
    async testInsert() {
        try {
            const testProduct = {
                id: 'TEST-' + Date.now(),
                name: 'Test Product ' + new Date().toLocaleString(),
                price: 100,
                cost: 50,
                min_stock: 5,
                max_stock: 50,
                unit: 'ชิ้น',
                category: 'Test'
            };
            
            const result = await this.saveProduct(testProduct);
            console.log('Test insert result:', result);
            return result.success;
        } catch (error) {
            console.error('Test insert failed:', error);
            return false;
        }
    }
    
    async getAllTables() {
        await this.ensureReady();
        
        const sql = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
        return this.fetchQuery(sql);
    }
    
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                    this.ready = false;
                }
            });
        }
    }
}

// สร้าง database instance
const database = new Database();

// เพิ่ม function สำหรับตรวจสอบว่า database พร้อม
database.waitForReady()
    .then(() => {
        console.log('Database is ready');
        
        // ทดสอบการเชื่อมต่อ
        database.testConnection()
            .then(isConnected => {
                console.log('Database connection test:', isConnected ? 'PASSED' : 'FAILED');
            })
            .catch(err => {
                console.error('Database connection test failed:', err);
            });
    })
    .catch(err => {
        console.error('Database failed to initialize:', err);
    });

module.exports = database; 