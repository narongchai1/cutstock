const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.productsFile = path.join(this.dataDir, 'products.json');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.pendingDeletesFile = path.join(this.dataDir, 'pending_deletes.json');
        
        this.initDatabase();
    }
    
    initDatabase() {
        // สร้างโฟลเดอร์ data ถ้ายังไม่มี
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        // สร้างไฟล์ products.json ถ้ายังไม่มี
        if (!fs.existsSync(this.productsFile)) {
            const initialProducts = [
                {
                    id: 'P001',
                    barcode: '8901234567890',
                    name: 'เมาส์เกมมิ่ง',
                    price: 599,
                    cost: 350,
                    stock: 25,
                    category: 'อิเล็กทรอนิกส์',
                    subcategory: 'อุปกรณ์คอมพิวเตอร์',
                    status: 'มีสินค้า',
                    created: new Date().toISOString()
                },
                {
                    id: 'P002',
                    barcode: '8901234567891',
                    name: 'คีย์บอร์ดล้ำ',
                    price: 1299,
                    cost: 800,
                    stock: 15,
                    category: 'อิเล็กทรอนิกส์',
                    subcategory: 'อุปกรณ์คอมพิวเตอร์',
                    status: 'มีสินค้า',
                    created: new Date().toISOString()
                },
                {
                    id: 'P003',
                    barcode: '8901234567892',
                    name: 'จอมอนิเตอร์ 24 นิ้ว',
                    price: 4500,
                    cost: 3200,
                    stock: 8,
                    category: 'อิเล็กทรอนิกส์',
                    subcategory: 'จอคอมพิวเตอร์',
                    status: 'สินค้าจำกัด',
                    created: new Date().toISOString()
                },
                {
                    id: 'P004',
                    barcode: '8901234567893',
                    name: 'ฮาร์ดดิสก์ 1TB',
                    price: 1890,
                    cost: 1400,
                    stock: 0,
                    category: 'อิเล็กทรอนิกส์',
                    subcategory: 'อุปกรณ์เก็บข้อมูล',
                    status: 'สินค้าหมด',
                    created: new Date().toISOString()
                }
            ];
            this.saveProducts(initialProducts);
        }
        
        // สร้างไฟล์ users.json ถ้ายังไม่มี
        if (!fs.existsSync(this.usersFile)) {
            const initialUsers = [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin123',
                    name: 'ผู้ดูแลระบบ',
                    role: 'admin',
                    created: new Date().toISOString()
                },
                {
                    id: 2,
                    username: 'staff',
                    password: 'staff123',
                    name: 'พนักงาน',
                    role: 'staff',
                    created: new Date().toISOString()
                }
            ];
            this.saveUsers(initialUsers);
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
    
    // ฟังก์ชันอ่านข้อมูลสินค้า
    getProducts() {
        try {
            const data = fs.readFileSync(this.productsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading products:', error);
            return [];
        }
    }
    
    // ฟังก์ชันบันทึกข้อมูลสินค้า
    saveProducts(products) {
        try {
            fs.writeFileSync(this.productsFile, JSON.stringify(products, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving products:', error);
            return false;
        }
    }
    
    // ฟังก์ชันเพิ่ม/อัพเดทสินค้า
    async saveProduct(product, options = {}) {
        const products = this.getProducts();
        const normalized = this.normalizeProduct(product);
        const existingIndex = products.findIndex(p => p.id === normalized.id);
        const now = new Date().toISOString();

        if (existingIndex >= 0) {
            products[existingIndex] = {
                ...products[existingIndex],
                ...normalized,
                updated: now,
            };
            products[existingIndex].synced_at = options.markSynced ? now : null;
        } else {
            const newProduct = {
                ...normalized,
                id: normalized.id || this.generateProductId(),
                created: normalized.created || now,
                updated: now,
                synced_at: options.markSynced ? now : null,
            };
            products.push(newProduct);
        }

        const success = this.saveProducts(products);
        return {
            success,
            product: existingIndex >= 0 ? products[existingIndex] : products[products.length - 1],
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
            console.error('Error reading users:', error);
            return [];
        }
    }
    
    // ฟังก์ชันบันทึกข้อมูลผู้ใช้
    saveUsers(users) {
        try {
            fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    }
    
    // ฟังก์ชันตรวจสอบผู้ใช้
    authenticate(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // ไม่ส่ง password กลับ
            const { password, ...userWithoutPassword } = user;
            return {
                success: true,
                user: userWithoutPassword,
                token: 'local-token-' + Date.now()
            };
        }
        
        return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    }

    getPendingDeletes() {
        try {
            const data = fs.readFileSync(this.pendingDeletesFile, 'utf8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error reading pending deletes:', error);
            return [];
        }
    }

    setPendingDeletes(ids) {
        try {
            fs.writeFileSync(this.pendingDeletesFile, JSON.stringify(ids, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving pending deletes:', error);
            return false;
        }
    }

    queueDelete(id) {
        const pending = this.getPendingDeletes();
        if (!pending.includes(id)) {
            pending.push(id);
            this.setPendingDeletes(pending);
        }
    }

    removePendingDeletes(ids) {
        const pending = this.getPendingDeletes();
        const idSet = new Set(ids);
        const next = pending.filter(id => !idSet.has(id));
        this.setPendingDeletes(next);
    }

    getUnsyncedProducts() {
        const products = this.getProducts();
        return products.filter(product => {
            if (!product.synced_at) {
                return true;
            }

            const updatedAt = product.updated || product.created;
            if (!updatedAt) {
                return true;
            }

            return new Date(updatedAt) > new Date(product.synced_at);
        });
    }

    setProducts(products, options = {}) {
        const now = new Date().toISOString();
        const normalized = (products || []).map(product => {
            const mapped = this.normalizeProduct(product);
            if (!mapped.created) {
                mapped.created = now;
            }
            if (!mapped.updated) {
                mapped.updated = now;
            }
            if (options.markSynced) {
                mapped.synced_at = now;
            }
            return mapped;
        });

        return this.saveProducts(normalized);
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
