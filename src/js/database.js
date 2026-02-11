// database.js - Fixed SQLite Version
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.productsFile = path.join(this.dataDir, 'products.json');
        this.usersFile = path.join(this.dataDir, 'users.json');
        
        this.initDatabase();
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

        if (!fs.existsSync(this.pendingDeletesFile)) {
            fs.writeFileSync(this.pendingDeletesFile, JSON.stringify([], null, 2));
        }
    }

    normalizeProduct(product) {
        const normalized = { ...product };
        if (!normalized.created && normalized.created_at) {
            normalized.created = normalized.created_at;
        }
        if (!normalized.updated && normalized.updated_at) {
            normalized.updated = normalized.updated_at;
        }
        return normalized;
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
    
    // ฟังก์ชันเพิ่ม/อัพเดทสินค้า
    async saveProduct(product) {
        const products = this.getProducts();
        
        // ตรวจสอบว่ามีสินค้านี้อยู่แล้วหรือไม่ (อัพเดท)
        const existingIndex = products.findIndex(p => p.id === product.id);
        
        if (existingIndex >= 0) {
            // อัพเดทสินค้าที่มีอยู่
            products[existingIndex] = {
                ...products[existingIndex],
                ...product,
                updated: new Date().toISOString()
            };
        } else {
            // เพิ่มสินค้าใหม่
            const newProduct = {
                ...product,
                id: product.id || this.generateProductId(),
                created: new Date().toISOString()
            };
            products.push(newProduct);
        }
        
        // บันทึกข้อมูล
        const success = this.saveProducts(products);
        return { 
            success, 
            product: existingIndex >= 0 ? products[existingIndex] : products[products.length - 1] 
        };
    }
    
    // ฟังก์ชันลบสินค้า
    async deleteProduct(id) {
        const products = this.getProducts();
        const filteredProducts = products.filter(p => p.id !== id);
        
        const success = this.saveProducts(filteredProducts);
        return { 
            success, 
            deleted: products.length !== filteredProducts.length 
        };
    }
    
    // ฟังก์ชันสร้างรหัสสินค้าใหม่
    generateProductId() {
        const products = this.getProducts();
        if (products.length === 0) return 'P001';
        
        const lastProduct = products[products.length - 1];
        if (lastProduct && lastProduct.id.startsWith('P')) {
            const lastNumber = parseInt(lastProduct.id.substring(1)) || 0;
            return `P${(lastNumber + 1).toString().padStart(3, '0')}`;
        }
        
        return 'P001';
    }
    
    // ฟังก์ชันอ่านข้อมูลผู้ใช้
    getUsers() {
        try {
            const data = fs.readFileSync(this.usersFile, 'utf8');
            return JSON.parse(data);
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
                user: userWithoutPassword,
                token: 'local-token-' + Date.now()
            };
        }
        
        return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    }
    
    // ฟังก์ชันดึงหมวดหมู่ทั้งหมด
    getCategories() {
        const products = this.getProducts();
        const categories = {};
        
        products.forEach(product => {
            if (product.category) {
                if (!categories[product.category]) {
                    categories[product.category] = new Set();
                }
                if (product.subcategory) {
                    categories[product.category].add(product.subcategory);
                }
            }
        });
        
        // แปลง Set เป็น Array
        const result = {};
        Object.keys(categories).forEach(cat => {
            result[cat] = Array.from(categories[cat]);
        });
        
        return result;
    }
}

module.exports = new Database();