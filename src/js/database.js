const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.productsFile = path.join(this.dataDir, 'products.json');
        this.usersFile = path.join(this.dataDir, 'users.json');
        
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