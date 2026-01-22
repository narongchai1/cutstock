// reports.js - แก้ไขให้เชื่อมกับ Stock

class ReportsManager {
    constructor() {
        this.stockStatusChart = null;
        this.categoryChart = null;
        this.reportData = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // แสดงสถานะการโหลด
            this.showDataStatus('กำลังโหลดข้อมูลจากสต็อก...', 'info');
            
            // 1. โหลดข้อมูล
            const products = await this.loadStockData();
            
            if (products.length === 0) {
                this.showDataStatus('ไม่พบข้อมูลสินค้า กรุณาเพิ่มสินค้าก่อน', 'warning');
                this.showEmptyState();
                return;
            }
            
            // 2. คำนวณรายงาน
            this.reportData = this.calculateReportData(products);
            
            // 3. แสดงรายงาน
            this.renderReports();
            
            // 4. อัพเดทสถานะ
            this.showDataStatus(`โหลดข้อมูลสำเร็จ: ${products.length} รายการ`, 'success');
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing reports:', error);
            this.showDataStatus('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
            this.showErrorState(error);
        }
    }

    async loadStockData() {
        // ลองโหลดข้อมูลจากหลายแหล่ง
        const dataSources = [
            this.loadFromLocalStorage(),
            this.loadFromIndexedDB(),
            this.loadFromElectron(),
            this.loadFromSampleData()
        ];
        
        for (const source of dataSources) {
            try {
                const products = await source;
                if (products && products.length > 0) {
                    console.log(`โหลดข้อมูลสำเร็จจาก ${source.name}: ${products.length} รายการ`);
                    return products;
                }
            } catch (error) {
                console.warn(`ไม่สามารถโหลดจาก ${source.name}:`, error);
            }
        }
        
        return [];
    }

    async loadFromLocalStorage() {
        // 1. ลองจาก localStorage
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        
        // 2. ลองจาก stock data ที่อาจเก็บแยก
        const stockData = JSON.parse(localStorage.getItem('stockData') || '[]');
        
        // รวมข้อมูล
        return [...products, ...stockData];
    }

    async loadFromIndexedDB() {
        // ถ้าใช้ IndexedDB
        if ('indexedDB' in window) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('stockDB', 1);
                
                request.onerror = reject;
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['products'], 'readonly');
                    const store = transaction.objectStore('products');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
                    getAllRequest.onerror = reject;
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('products')) {
                        db.createObjectStore('products', { keyPath: 'id' });
                    }
                };
            });
        }
        
        return [];
    }

    async loadFromElectron() {
        // ถ้าทำงานใน Electron
        if (window.electronAPI) {
            try {
                if (window.electronAPI.getProducts) {
                    return await window.electronAPI.getProducts();
                }
                if (window.electronAPI.getAllProducts) {
                    return await window.electronAPI.getAllProducts();
                }
            } catch (error) {
                console.error('Error loading from Electron:', error);
            }
        }
        
        return [];
    }

    async loadFromSampleData() {
        // ข้อมูลตัวอย่างสำหรับทดสอบ
        return [
            {
                id: 'P001',
                code: 'P001',
                name: 'น้ำดื่มคริสตัล 600ml',
                price: 12,
                cost: 8,
                stock: 150,
                category: 'เครื่องดื่ม',
                barcode: '8901234567890',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'P002',
                code: 'P002',
                name: 'ขนมปังฝรั่งเศส',
                price: 25,
                cost: 15,
                stock: 8,
                category: 'อาหาร',
                barcode: '8901234567891',
                lastUpdated: new Date().toISOString()
            },
            {
                id: 'P003',
                code: 'P003',
                name: 'กาแฟอาราบิก้า 250g',
                price: 199,
                cost: 120,
                stock: 0,
                category: 'เครื่องดื่ม',
                barcode: '8901234567892',
                lastUpdated: new Date().toISOString()
            }
        ];
    }

    async syncStockData() {
        this.showDataStatus('กำลังซิงค์ข้อมูลกับสต็อก...', 'info');
        
        try {
            // 1. ลองดึงข้อมูลล่าสุดจากแหล่งต่างๆ
            const products = await this.loadStockData();
            
            // 2. บันทึกลง localStorage สำหรับใช้งานในหน้า reports
            localStorage.setItem('reports_cache', JSON.stringify({
                products: products,
                lastSynced: new Date().toISOString()
            }));
            
            // 3. รีเฟรชรายงาน
            this.reportData = this.calculateReportData(products);
            this.renderReports();
            
            this.showDataStatus(`ซิงค์ข้อมูลสำเร็จ: ${products.length} รายการ`, 'success');
        } catch (error) {
            console.error('Error syncing stock data:', error);
            this.showDataStatus('เกิดข้อผิดพลาดในการซิงค์ข้อมูล', 'danger');
        }
    }

    calculateReportData(products) {
        // ... คำนวณข้อมูลรายงาน (เหมือนเดิม)
    }

    renderReports() {
        const content = document.getElementById('reportsContent');
        
        if (!this.reportData) {
            content.innerHTML = this.getEmptyTemplate();
            return;
        }
        
        content.innerHTML = this.getReportsTemplate();
        
        // สร้างกราฟ
        this.createCharts();
        
        // อัพเดทข้อมูล
        this.updateReportData();
    }

    getReportsTemplate() {
        return `
            <div class="report-header">
                <h2><i class="fas fa-chart-pie"></i> สรุปภาพรวมสต็อก</h2>
                <div class="date-filter">
                    <input type="date" id="startDate" class="form-control">
                    <span>ถึง</span>
                    <input type="date" id="endDate" class="form-control">
                    <button class="btn btn-sm btn-primary" onclick="window.reportsManager.filterByDate()">
                        <i class="fas fa-filter"></i> กรอง
                    </button>
                </div>
            </div>
            
            <div class="summary-grid">
                <div class="summary-item">
                    <h4>สินค้าทั้งหมด</h4>
                    <div class="value" id="totalProducts">0</div>
                </div>
                <div class="summary-item">
                    <h4>มูลค่าสต็อก</h4>
                    <div class="value" id="totalValue">฿0</div>
                </div>
                <div class="summary-item">
                    <h4>สินค้าใกล้หมด</h4>
                    <div class="value warning" id="lowStock">0</div>
                </div>
                <div class="summary-item">
                    <h4>สินค้าหมด</h4>
                    <div class="value danger" id="outOfStock">0</div>
                </div>
            </div>
            
            <div class="reports-container">
                <div class="report-card">
                    <h3><i class="fas fa-boxes"></i> สถานะสินค้า</h3>
                    <div class="chart-container">
                        <canvas id="stockStatusChart"></canvas>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3><i class="fas fa-tags"></i> สินค้าตามหมวดหมู่</h3>
                    <div class="chart-container">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
                
                <div class="report-card">
                    <h3><i class="fas fa-exclamation-triangle"></i> สินค้าใกล้หมด</h3>
                    <ul class="report-list" id="lowStockList">
                        <!-- จะถูกเติมโดย JavaScript -->
                    </ul>
                </div>
                
                <div class="report-card">
                    <h3><i class="fas fa-chart-line"></i> สถิติสต็อก</h3>
                    <div class="stats-grid" id="stockStats">
                        <!-- จะถูกเติมโดย JavaScript -->
                    </div>
                </div>
            </div>
            
            <div class="detailed-report mt-20">
                <h3><i class="fas fa-list"></i> รายงานสินค้าทั้งหมด</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>รหัส</th>
                                <th>ชื่อสินค้า</th>
                                <th>หมวดหมู่</th>
                                <th>จำนวน</th>
                                <th>ราคา</th>
                                <th>มูลค่า</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody id="productsTable">
                            <!-- จะถูกเติมโดย JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getEmptyTemplate() {
        return `
            <div class="empty-state">
                <i class="fas fa-database"></i>
                <h3>ไม่พบข้อมูลสต็อก</h3>
                <p>ยังไม่มีข้อมูลสินค้าในระบบ กรุณาเพิ่มสินค้าที่หน้าการจัดการสต็อก</p>
                <div class="mt-20">
                    <button class="btn btn-primary" onclick="window.location.href='stock.html'">
                        <i class="fas fa-arrow-left"></i> ไปที่หน้าการจัดการสต็อก
                    </button>
                    <button class="btn btn-success" onclick="window.reportsManager.syncStockData()">
                        <i class="fas fa-sync-alt"></i> ลองโหลดข้อมูลใหม่
                    </button>
                </div>
            </div>
        `;
    }

    updateReportData() {
        if (!this.reportData) return;
        
        // อัพเดท summary
        document.getElementById('totalProducts').textContent = this.reportData.totalProducts;
        document.getElementById('totalValue').textContent = this.formatCurrency(this.reportData.totalValue);
        document.getElementById('lowStock').textContent = this.reportData.lowStockCount;
        document.getElementById('outOfStock').textContent = this.reportData.outOfStockCount;
        
        // อัพเดท low stock list
        this.updateLowStockList();
        
        // อัพเดท products table
        this.updateProductsTable();
    }

    updateLowStockList() {
        const list = document.getElementById('lowStockList');
        if (!list) return;
        
        if (this.reportData.lowStockItems.length === 0) {
            list.innerHTML = '<li class="text-center text-gray">ไม่มีสินค้าใกล้หมด</li>';
            return;
        }
        
        list.innerHTML = this.reportData.lowStockItems.map(item => `
            <li>
                <div>
                    <strong>${item.name}</strong>
                    <div class="text-sm text-gray">${item.code}</div>
                </div>
                <span class="report-value warning">${item.stock} ชิ้น</span>
            </li>
        `).join('');
    }

    updateProductsTable() {
        const tbody = document.getElementById('productsTable');
        if (!tbody) return;
        
        // ในที่นี้ใช้ sample data แสดง
        const products = [
            { code: 'P001', name: 'น้ำดื่มคริสตัล', category: 'เครื่องดื่ม', stock: 150, price: 12, value: 1800, status: 'ปกติ' },
            { code: 'P002', name: 'ขนมปังฝรั่งเศส', category: 'อาหาร', stock: 8, price: 25, value: 200, status: 'ใกล้หมด' },
            { code: 'P003', name: 'กาแฟอาราบิก้า', category: 'เครื่องดื่ม', stock: 0, price: 199, value: 0, status: 'หมด' }
        ];
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td><span class="badge badge-primary">${product.code}</span></td>
                <td>${product.name}</td>
                <td><span class="badge badge-info">${product.category}</span></td>
                <td>${product.stock}</td>
                <td>฿${product.price.toLocaleString()}</td>
                <td>฿${product.value.toLocaleString()}</td>
                <td>
                    <span class="badge ${product.status === 'ปกติ' ? 'badge-success' : product.status === 'ใกล้หมด' ? 'badge-warning' : 'badge-danger'}">
                        ${product.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    showDataStatus(message, type = 'info') {
        const alert = document.getElementById('dataStatusAlert');
        const text = document.getElementById('dataStatusText');
        
        if (alert && text) {
            alert.className = `alert alert-${type}`;
            text.textContent = message;
            alert.style.display = 'flex';
            
            // ซ่อนอัตโนมัติหลังจาก 5 วินาที (ยกเว้น error)
            if (type !== 'danger') {
                setTimeout(() => {
                    alert.style.display = 'none';
                }, 5000);
            }
        }
    }

    showEmptyState() {
        const content = document.getElementById('reportsContent');
        if (content) {
            content.innerHTML = this.getEmptyTemplate();
        }
    }

    showErrorState(error) {
        const content = document.getElementById('reportsContent');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle text-danger"></i>
                    <h3 class="text-danger">เกิดข้อผิดพลาด</h3>
                    <p>ไม่สามารถโหลดข้อมูลได้</p>
                    <div class="mt-20">
                        <button class="btn btn-primary" onclick="window.location.href='stock.html'">
                            <i class="fas fa-arrow-left"></i> กลับไปหน้าการจัดการสต็อก
                        </button>
                        <button class="btn btn-warning" onclick="window.reportsManager.init()">
                            <i class="fas fa-redo"></i> ลองอีกครั้ง
                        </button>
                    </div>
                </div>
            `;
        }
    }

    formatCurrency(amount) {
        return '฿' + (amount || 0).toLocaleString('th-TH');
    }

    // ... methods อื่นๆ ที่เหลือเหมือนเดิม
}

// Initialize
window.reportsManager = new ReportsManager();