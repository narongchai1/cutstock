// stock.js - ระบบจัดการสต็อกสินค้า (อัพเดท)

// ตรวจสอบการยืนยันตัวตน
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(user);
}

// ตัวแปรเก็บข้อมูลสินค้า
let productsData = [];

// แสดงแจ้งเตือน
function showAlert(message, type = 'info') {
    // ลบ alert เก่าทั้งหมดก่อน
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button class="btn-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // สไตล์ alert
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #66BB6A, #4CAF50)' : 
                     type === 'danger' ? 'linear-gradient(135deg, #EF5350, #D32F2F)' : 
                     type === 'warning' ? 'linear-gradient(135deg, #FFB74D, #FF9800)' : 
                     'linear-gradient(135deg, #29B6F6, #0288D1)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 280px;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
    `;
    
    document.body.appendChild(alertDiv);
    
    // ลบ alert หลังจาก 3 วินาที
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 3000);
}

// รูปแบบสกุลเงิน
function formatCurrency(amount) {
    return '฿' + amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// คำนวณมูลค่ารวม
function calculateTotalValue(products) {
    return products.reduce((total, product) => {
        const quantity = product.quantity || 0;
        const price = product.price || 0;
        return total + (quantity * price);
    }, 0);
}

// ฟังก์ชันบันทึกข้อมูลเพื่อใช้ใน Reports
function saveDataForReports(products) {
    try {
        // 1. บันทึกข้อมูลลง localStorage สำหรับ Reports
        localStorage.setItem('reports_products', JSON.stringify(products));
        
        // 2. บันทึกข้อมูลแบบ cache พร้อม timestamp
        const cacheData = {
            products: products,
            timestamp: new Date().toISOString(),
            source: 'stock_page',
            totalProducts: products.length,
            totalValue: calculateTotalValue(products),
            // เพิ่มข้อมูลสรุป
            summary: {
                totalProducts: products.length,
                totalValue: calculateTotalValue(products),
                inStock: products.filter(p => (p.quantity || 0) > 0).length,
                lowStock: products.filter(p => {
                    const qty = p.quantity || 0;
                    const reorder = p.reorderPoint || 10;
                    return qty > 0 && qty <= reorder;
                }).length,
                outOfStock: products.filter(p => (p.quantity || 0) === 0).length
            }
        };
        
        localStorage.setItem('reports_cache', JSON.stringify(cacheData));
        
        // 3. บันทึกเป็น key ง่ายๆ สำหรับดึงข้อมูลด่วน
        localStorage.setItem('stock_data', JSON.stringify(products));
        
        console.log('Data saved for reports:', products.length, 'products');
        
        // 4. ส่ง event ไปยังหน้า Reports (ถ้าเปิดอยู่)
        dispatchStockUpdateEvent(products);
        
        return true;
        
    } catch (error) {
        console.error('Error saving data for reports:', error);
        return false;
    }
}

// ส่ง event เมื่อข้อมูล stock อัพเดท
function dispatchStockUpdateEvent(products) {
    try {
        // ส่ง custom event
        const event = new CustomEvent('stock-data-updated', {
            detail: { 
                products, 
                timestamp: new Date().toISOString(),
                summary: {
                    total: products.length,
                    value: calculateTotalValue(products)
                }
            }
        });
        window.dispatchEvent(event);
        
        // ใช้ localStorage event (ทำงานข้าม tab)
        localStorage.setItem('stock_update_trigger', Date.now().toString());
        
    } catch (error) {
        console.error('Error dispatching stock update event:', error);
    }
}

// สร้างข้อมูลตัวอย่าง
function createSampleProducts() {
    const now = new Date();
    
    // สร้างวันที่สำหรับตัวอย่าง
    const createDate = (daysToAdd) => {
        const date = new Date(now);
        date.setDate(date.getDate() + daysToAdd);
        return date.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    return [
        {
            id: 'P001',
            code: 'P001',
            barcode: '8901234567890',
            name: 'น้ำดื่มคริสตัล 600ml',
            category: 'เครื่องดื่ม',
            unit: 'ขวด',
            price: 12.00,
            cost: 8.00,
            quantity: 150,
            reorderPoint: 20,
            lowPoint: 10,
            location: 'A01-01',
            expiryDate: createDate(90),
            warrantyDate: createDate(365),
            status: 'in-stock'
        },
        {
            id: 'P002',
            code: 'P002',
            barcode: '8901234567891',
            name: 'ขนมปังฝรั่งเศส',
            category: 'อาหาร',
            unit: 'ก้อน',
            price: 25.00,
            cost: 15.00,
            quantity: 8,
            reorderPoint: 15,
            lowPoint: 5,
            location: 'B02-03',
            expiryDate: createDate(7),
            warrantyDate: 'ไม่มี',
            status: 'low-stock'
        },
        {
            id: 'P003',
            code: 'P003',
            barcode: '8901234567892',
            name: 'กาแฟอาราบิก้า 250g',
            category: 'เครื่องดื่ม',
            unit: 'ถุง',
            price: 199.00,
            cost: 120.00,
            quantity: 0,
            reorderPoint: 10,
            lowPoint: 3,
            location: 'C03-02',
            expiryDate: createDate(180),
            warrantyDate: createDate(730),
            status: 'out-of-stock'
        },
        {
            id: 'P004',
            code: 'P004',
            barcode: '8901234567893',
            name: 'แบตเตอรี่ AA',
            category: 'อิเล็กทรอนิกส์',
            unit: 'แผง',
            price: 45.00,
            cost: 25.00,
            quantity: 75,
            reorderPoint: 30,
            lowPoint: 15,
            location: 'D01-04',
            expiryDate: createDate(365),
            warrantyDate: createDate(365),
            status: 'in-stock'
        },
        {
            id: 'P005',
            code: 'P005',
            barcode: '8901234567894',
            name: 'ยาสีฟัน Colgate',
            category: 'ของใช้ส่วนตัว',
            unit: 'หลอด',
            price: 89.00,
            cost: 55.00,
            quantity: 25,
            reorderPoint: 25,
            lowPoint: 12,
            location: 'E02-01',
            expiryDate: createDate(180),
            warrantyDate: 'ไม่มี',
            status: 'in-stock'
        },
        {
            id: 'P006',
            code: 'P006',
            barcode: '8901234567895',
            name: 'นม UHT 1 ลิตร',
            category: 'อาหาร',
            unit: 'กล่อง',
            price: 35.00,
            cost: 22.00,
            quantity: 5,
            reorderPoint: 15,
            lowPoint: 5,
            location: 'F01-03',
            expiryDate: createDate(30),
            warrantyDate: 'ไม่มี',
            status: 'low-stock'
        },
        {
            id: 'P007',
            code: 'P007',
            barcode: '8901234567896',
            name: 'โทรศัพท์มือถือ Samsung',
            category: 'อิเล็กทรอนิกส์',
            unit: 'เครื่อง',
            price: 12990.00,
            cost: 9500.00,
            quantity: 12,
            reorderPoint: 5,
            lowPoint: 2,
            location: 'G03-01',
            expiryDate: 'ไม่มี',
            warrantyDate: createDate(730),
            status: 'in-stock'
        },
        {
            id: 'P008',
            code: 'P008',
            barcode: '8901234567897',
            name: 'กระดาษ A4 80แกรม',
            category: 'เครื่องเขียน',
            unit: 'รีม',
            price: 120.00,
            cost: 75.00,
            quantity: 0,
            reorderPoint: 10,
            lowPoint: 3,
            location: 'H02-02',
            expiryDate: 'ไม่มี',
            warrantyDate: 'ไม่มี',
            status: 'out-of-stock'
        },
        {
            id: 'P009',
            code: 'P009',
            barcode: '8901234567898',
            name: 'น้ำมันพืช 1 ลิตร',
            category: 'อาหาร',
            unit: 'ขวด',
            price: 65.00,
            cost: 45.00,
            quantity: 32,
            reorderPoint: 20,
            lowPoint: 10,
            location: 'I01-05',
            expiryDate: createDate(120),
            warrantyDate: 'ไม่มี',
            status: 'in-stock'
        },
        {
            id: 'P010',
            code: 'P010',
            barcode: '8901234567899',
            name: 'สบู่ล้างหน้า',
            category: 'ของใช้ส่วนตัว',
            unit: 'ก้อน',
            price: 55.00,
            cost: 35.00,
            quantity: 3,
            reorderPoint: 15,
            lowPoint: 8,
            location: 'J02-04',
            expiryDate: createDate(60),
            warrantyDate: 'ไม่มี',
            status: 'low-stock'
        }
    ];
}

// ฟังก์ชันโหลดข้อมูลสินค้า
async function loadProducts() {
    try {
        let products = [];
        
        // ตรวจสอบว่ามี electron API หรือไม่
        if (window.electronAPI && window.electronAPI.getProducts) {
            products = await window.electronAPI.getProducts();
        } else {
            // ใช้ localStorage fallback
            const productsJson = localStorage.getItem('products');
            if (productsJson) {
                products = JSON.parse(productsJson);
            } else {
                // สร้างข้อมูลตัวอย่าง
                products = createSampleProducts();
                localStorage.setItem('products', JSON.stringify(products));
            }
        }
        
        // บันทึกลงตัวแปร global
        productsData = products;
        
        // แสดงสินค้าในตาราง
        displayProducts(products);
        
        // บันทึกข้อมูลเพื่อใช้ใน Reports
        saveDataForReports(products);
        
        // อัพเดทการ์ดสรุป
        updateSummaryCards(products);
        
        return products;
        
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า', 'danger');
        return [];
    }
}

// แสดงสินค้าในตาราง
function displayProducts(products) {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="15" class="text-center" style="padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                    <p style="color: var(--gray); font-weight: 500;">ไม่มีข้อมูลสินค้า</p>
                    <button class="btn btn-primary mt-20" onclick="window.location.href='add-product.html'">
                        <i class="fas fa-plus-circle"></i> เพิ่มสินค้าตัวแรก
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    products.forEach((product, index) => {
        const row = document.createElement('tr');
        row.style.animation = `fadeIn 0.3s ease ${index * 0.05}s`;
        
        // กำหนดสถานะ
        const quantity = product.quantity || 0;
        const reorderPoint = product.reorderPoint || 10;
        const lowPoint = product.lowPoint || 5;
        
        let statusClass = 'status-in-stock';
        let statusText = 'มีสต็อก';
        let badgeClass = 'badge-success';
        
        if (quantity === 0) {
            statusClass = 'status-out-of-stock';
            statusText = 'หมดสต็อก';
            badgeClass = 'badge-danger';
        } else if (quantity <= lowPoint) {
            statusClass = 'status-danger';
            statusText = 'วิกฤต';
            badgeClass = 'badge-danger';
        } else if (quantity <= reorderPoint) {
            statusClass = 'status-low-stock';
            statusText = 'ใกล้หมด';
            badgeClass = 'badge-warning';
        }
        
        // กำหนดสีจำนวนตามสถานะ
        let quantityColor = 'var(--success)';
        if (quantity === 0) quantityColor = 'var(--danger)';
        else if (quantity <= lowPoint) quantityColor = 'var(--danger)';
        else if (quantity <= reorderPoint) quantityColor = 'var(--warning)';
        
        row.innerHTML = `
            <td>
                <span class="badge badge-info">${product.code || 'N/A'}</span>
            </td>
            <td>
                <span class="barcode-text">
                    ${product.barcode || 'ไม่มี'}
                </span>
            </td>
            <td>
                <strong class="product-name">
                    ${product.name || 'ไม่มีชื่อ'}
                </strong>
            </td>
            <td>
                <span class="category-tag">${product.category || 'ทั่วไป'}</span>
            </td>
            <td>
                <span class="unit-badge">${product.unit || 'ชิ้น'}</span>
            </td>
            <td>
                <span class="price-text">
                    ${formatCurrency(product.price || 0)}
                </span>
            </td>
            <td>
                <span class="cost-text">
                    ${formatCurrency(product.cost || 0)}
                </span>
            </td>
            <td>
                <span class="reorder-badge ${quantity <= reorderPoint ? 'reorder-warning' : 'reorder-normal'}">
                    ${reorderPoint}
                </span>
            </td>
            <td>
                <span class="quantity-text" style="color: ${quantityColor};">
                    ${quantity.toLocaleString()}
                </span>
            </td>
            <td>
                <span class="location-tag">${product.location || 'N/A'}</span>
            </td>
            <td>
                <span class="${badgeClass}">
                    <span class="status-indicator ${statusClass}"></span>
                    ${statusText}
                </span>
            </td>
            <td>
                <span class="date-badge">${product.expiryDate || 'ไม่มี'}</span>
            </td>
            <td>
                <span class="warranty-badge">${product.warrantyDate || 'ไม่มี'}</span>
            </td>
            <td>
                <span class="lowpoint-badge">${lowPoint}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewProduct('${product.id || product.code}')" title="ดูรายละเอียด">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editProduct('${product.id || product.code}')" title="แก้ไข">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteProduct('${product.id || product.code}')" title="ลบ">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// อัพเดทการ์ดสรุป
function updateSummaryCards(products) {
    if (!products || !products.length) {
        document.getElementById('productCount').textContent = '0';
        document.getElementById('stockValue').textContent = '฿0.00';
        document.getElementById('lowStock').textContent = '0';
        document.getElementById('outOfStock').textContent = '0';
        return;
    }
    
    const totalProducts = products.length;
    const totalValue = calculateTotalValue(products);
    
    // คำนวณสินค้าใกล้หมด
    const lowStock = products.filter(p => {
        const quantity = p.quantity || 0;
        const reorderPoint = p.reorderPoint || 10;
        return quantity > 0 && quantity <= reorderPoint;
    }).length;
    
    // คำนวณสินค้าหมด
    const outOfStock = products.filter(p => {
        const quantity = p.quantity || 0;
        return quantity === 0;
    }).length;
    
    document.getElementById('productCount').textContent = totalProducts.toLocaleString();
    document.getElementById('stockValue').textContent = formatCurrency(totalValue);
    document.getElementById('lowStock').textContent = lowStock.toLocaleString();
    document.getElementById('outOfStock').textContent = outOfStock.toLocaleString();
}

// ดูรายละเอียดสินค้า
function viewProduct(productId) {
    // บันทึกลง localStorage เพื่อใช้ในหน้า view
    localStorage.setItem('viewing_product_id', productId);
    window.location.href = 'view-product.html';
}

// แก้ไขสินค้า
function editProduct(productId) {
    // บันทึกลง localStorage เพื่อใช้ในหน้า edit
    localStorage.setItem('editing_product_id', productId);
    window.location.href = 'edit-product.html';
}

// ลบสินค้า
async function deleteProduct(productId) {
    if (confirm('คุณแน่ใจว่าต้องการลบสินค้านี้?')) {
        try {
            let result;
            
            if (window.electronAPI && window.electronAPI.deleteProduct) {
                // ใช้ electron API
                result = await window.electronAPI.deleteProduct(productId);
            } else {
                // ใช้ localStorage fallback
                const productsJson = localStorage.getItem('products');
                let products = productsJson ? JSON.parse(productsJson) : [];
                
                // ค้นหาและลบสินค้า
                const index = products.findIndex(p => (p.id === productId || p.code === productId));
                if (index !== -1) {
                    products.splice(index, 1);
                    localStorage.setItem('products', JSON.stringify(products));
                    result = { success: true };
                } else {
                    result = { success: false, error: 'ไม่พบสินค้า' };
                }
            }
            
            if (result.success) {
                showAlert('ลบสินค้าเรียบร้อยแล้ว', 'success');
                // โหลดข้อมูลใหม่และ sync ไปยัง reports
                const updatedProducts = await loadProducts();
                saveDataForReports(updatedProducts);
            } else {
                showAlert(result.error || 'เกิดข้อผิดพลาดในการลบสินค้า', 'danger');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showAlert('เกิดข้อผิดพลาดในการลบสินค้า', 'danger');
        }
    }
}

// ตรวจสอบสถานะออนไลน์
function checkOnlineStatus() {
    // ตั้งค่าให้เป็น offline ตลอดเวลา
    updateOnlineStatus(false);
    
    // แสดงสถานะว่า offline
    const statusElement = document.getElementById('onlineStatus');
    if (statusElement) {
        statusElement.className = 'status-badge offline';
        statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> ออฟไลน์';
    }
    
    // ซ่อนเมนู online-only
    document.querySelectorAll('.online-only').forEach(el => {
        el.style.display = 'none';
    });
}

// ค้นหาสินค้า
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#productTableBody tr');
    let foundCount = 0;
    
    rows.forEach(row => {
        if (row.cells.length > 1) {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
                foundCount++;
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    // แสดงผลการค้นหา
    if (searchTerm && foundCount > 0) {
        showAlert(`พบ ${foundCount} รายการที่ตรงกับการค้นหา`, 'success');
    } else if (searchTerm) {
        showAlert('ไม่พบสินค้าที่ตรงกับการค้นหา', 'warning');
    }
}

// ล้างการค้นหา
function clearSearch() {
    document.getElementById('searchInput').value = '';
    const rows = document.querySelectorAll('#productTableBody tr');
    rows.forEach(row => {
        row.style.display = '';
    });
    showAlert('ล้างการค้นหาแล้ว', 'info');
}

// ออกจากระบบ
function logout() {
    if (confirm('คุณแน่ใจว่าต้องการออกจากระบบ?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

// ฟังก์ชันเปลี่ยนภาษา
function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    if (lang === 'th') {
        showAlert('เปลี่ยนภาษาเป็นไทยเรียบร้อย', 'success');
    } else {
        showAlert('Language changed to English', 'success');
    }
    // โหลดหน้าใหม่เพื่ออัพเดทภาษา
    setTimeout(() => location.reload(), 1000);
}

// เมนูตั้งค่า
function toggleSettings() {
    const dropdown = document.getElementById('settingsDropdown');
    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        // ปรับตำแหน่งเมนู
        adjustDropdownPosition();
        // เพิ่ม event listener สำหรับปิดเมนู
        document.addEventListener('click', closeSettingsOnClickOutside);
        // ป้องกันไม่ให้เมนูอยู่เกินขอบจอ
        preventDropdownOverflow();
    } else {
        document.removeEventListener('click', closeSettingsOnClickOutside);
    }
}

function adjustDropdownPosition() {
    const dropdown = document.getElementById('settingsDropdown');
    const button = document.getElementById('settingsButton');
    
    if (!dropdown || !button) return;
    
    const buttonRect = button.getBoundingClientRect();
    const headerRect = document.querySelector('.header').getBoundingClientRect();
    
    // ตั้งค่าตำแหน่งให้อยู่ด้านล่างของ Header
    dropdown.style.top = (headerRect.bottom + 10) + 'px';
    dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';
}

function preventDropdownOverflow() {
    const dropdown = document.getElementById('settingsDropdown');
    const dropdownRect = dropdown.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    
    // ถ้า dropdown เกินขอบจอด้านขวา
    if (dropdownRect.right > windowWidth) {
        dropdown.style.right = '10px';
    }
    
    // ถ้า dropdown เกินขอบจอด้านซ้าย
    if (dropdownRect.left < 0) {
        dropdown.style.left = '10px';
        dropdown.style.right = 'auto';
    }
}

function closeSettingsOnClickOutside(event) {
    const dropdown = document.getElementById('settingsDropdown');
    const button = document.getElementById('settingsButton');
    
    if (!dropdown.contains(event.target) && event.target !== button) {
        dropdown.classList.remove('show');
        document.removeEventListener('click', closeSettingsOnClickOutside);
    }
}

// อัพเดทข้อมูลทุกครั้งที่โหลดหน้า
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบการยืนยันตัวตน
    const user = checkAuth();
    if (!user) return;
    
    // แสดงชื่อผู้ใช้
    const userElement = document.getElementById('currentUser');
    if (userElement) {
        userElement.textContent = user.name || 'ผู้ดูแลระบบ';
    }
    
    // ตั้งค่าให้เป็น offline
    checkOnlineStatus();
    
    // โหลดข้อมูลสินค้า
    loadProducts();
    
    // ตั้งเวลา sync อัตโนมัติทุก 30 วินาที
    setInterval(async () => {
        try {
            const products = await loadProducts();
            saveDataForReports(products);
        } catch (error) {
            console.error('Auto-sync error:', error);
        }
    }, 30000);
    
    // ตั้งเวลา auto clear การค้นหาทุก 5 นาที
    setInterval(() => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            searchInput.value = '';
            const rows = document.querySelectorAll('#productTableBody tr');
            rows.forEach(row => {
                row.style.display = '';
            });
            showAlert('ล้างการค้นหาโดยอัตโนมัติแล้ว', 'info');
        }
    }, 300000); // 5 นาที
    
    // ตั้งค่าการค้นหาแบบ real-time
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                searchProducts();
            }, 300);
        });
    }
    
    // เพิ่ม event listener สำหรับ keypress
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.activeElement.id === 'searchInput') {
            searchProducts();
        }
    });
    
    // ปรับขนาดเมนูเมื่อหน้าต่างเปลี่ยนขนาด
    window.addEventListener('resize', function() {
        const dropdown = document.getElementById('settingsDropdown');
        if (dropdown.classList.contains('show')) {
            adjustDropdownPosition();
            preventDropdownOverflow();
        }
    });
    
    // เพิ่ม CSS สำหรับ animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .alert {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-width: 280px;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        }
        
        .btn-close {
            background: none;
            border: none;
            cursor: pointer;
            color: white;
            margin-left: 10px;
            transition: color 0.3s;
            font-size: 18px;
        }
        
        .btn-close:hover {
            color: rgba(255, 255, 255, 0.8);
        }
    `;
    document.head.appendChild(style);
});

// Export ฟังก์ชันสำหรับใช้ในหน้า HTML
window.searchProducts = searchProducts;
window.clearSearch = clearSearch;
window.logout = logout;
window.changeLanguage = changeLanguage;
window.toggleSettings = toggleSettings;
window.adjustDropdownPosition = adjustDropdownPosition;
window.closeSettingsOnClickOutside = closeSettingsOnClickOutside;
window.viewProduct = viewProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;