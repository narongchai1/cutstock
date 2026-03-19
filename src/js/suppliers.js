// suppliers.js - จัดการซัพพลายเออร์

// Global variables
let suppliers = [];
let allProducts = [];
let allLots = [];

// โหลดซัพพลายเออร์
async function loadSuppliers() {
    try {
        // โหลดจาก localStorage
        const storedSuppliers = localStorage.getItem('suppliers');
        if (storedSuppliers) {
            suppliers = JSON.parse(storedSuppliers);
        }
        
        // โหลดสินค้าจาก localStorage
        const storedProducts = localStorage.getItem('products');
        if (storedProducts) {
            allProducts = JSON.parse(storedProducts);
        }
        
        // โหลดล็อตจาก localStorage
        const storedLots = localStorage.getItem('productLots');
        if (storedLots) {
            allLots = JSON.parse(storedLots);
        }
        
        // โหลดจาก database ถ้ามี
        if (window.electronAPI) {
            const dbSuppliers = await window.electronAPI.getAllSuppliers?.();
            if (dbSuppliers && dbSuppliers.length > 0) {
                suppliers = dbSuppliers;
                localStorage.setItem('suppliers', JSON.stringify(suppliers));
            }
            
            const dbProducts = await window.electronAPI.getProducts?.();
            if (dbProducts && dbProducts.length > 0) {
                allProducts = dbProducts;
                localStorage.setItem('products', JSON.stringify(allProducts));
            }
        }
        
        // อัพเดทสถิติ
        updateStatistics();
        
        // แสดงซัพพลายเออร์
        displaySuppliers();
        
        // ตรวจสอบว่ามีการเลือกซัพพลายเออร์จากหน้าอื่นหรือไม่
        const selectedSupplier = localStorage.getItem('selectedSupplier');
        if (selectedSupplier) {
            setTimeout(() => {
                highlightSupplier(selectedSupplier);
                localStorage.removeItem('selectedSupplier');
            }, 500);
        }
        
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดซัพพลายเออร์', 'danger');
    }
}

// อัพเดทสถิติ
function updateStatistics() {
    document.getElementById('totalSuppliers').textContent = suppliers.length;
    
    // นับสินค้าทั้งหมด
    const totalProducts = allProducts.length;
    document.getElementById('totalProducts').textContent = totalProducts;
    
    // นับล็อตทั้งหมด
    let totalLots = 0;
    if (allLots && typeof allLots === 'object') {
        Object.values(allLots).forEach(productLots => {
            totalLots += productLots.length;
        });
    }
    document.getElementById('totalLots').textContent = totalLots;
}

// แสดงซัพพลายเออร์
function displaySuppliers() {
    const container = document.getElementById('suppliersContainer');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    if (suppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <p>ไม่มีข้อมูลซัพพลายเออร์</p>
                <button class="btn btn-primary" onclick="showAddSupplierModal()">
                    <i class="fas fa-plus"></i> เพิ่มซัพพลายเออร์แรก
                </button>
            </div>
        `;
        return;
    }
    
    // กรองตามคำค้นหา
    let filteredSuppliers = suppliers;
    if (searchTerm) {
        filteredSuppliers = suppliers.filter(supplier => {
            const searchFields = [
                supplier.code,
                supplier.name,
                supplier.contact_person || supplier.contact,
                supplier.phone,
                supplier.email
            ].filter(Boolean).map(f => f.toLowerCase());
            
            return searchFields.some(field => field.includes(searchTerm));
        });
    }
    
    if (filteredSuppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>ไม่พบซัพพลายเออร์ที่ค้นหา</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="suppliers-grid">';
    
    filteredSuppliers.forEach(supplier => {
        // นับจำนวนสินค้าที่มาจากซัพพลายเออร์นี้
        let productCount = 0;
        if (allLots && typeof allLots === 'object') {
            Object.values(allLots).forEach(productLots => {
                const hasSupplier = productLots.some(lot => 
                    (lot.supplier_code || lot.supplierCode) === supplier.code
                );
                if (hasSupplier) productCount++;
            });
        }
        
        html += `
            <div class="supplier-card" data-code="${supplier.code}">
                <div class="supplier-header-card">
                    <div class="supplier-code">${supplier.code}</div>
                    <div class="supplier-name">${supplier.name}</div>
                    <div class="supplier-actions">
                        <button class="btn btn-sm btn-warning" onclick="editSupplier('${supplier.code}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSupplier('${supplier.code}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="supplier-body">
                    <div class="contact-person">
                        <i class="fas fa-user"></i> 
                        ${supplier.contact_person || supplier.contact || 'ไม่ระบุผู้ติดต่อ'}
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label"><i class="fas fa-phone"></i> โทร:</div>
                        <div class="info-value">${supplier.phone || '-'}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label"><i class="fas fa-envelope"></i> อีเมล:</div>
                        <div class="info-value">${supplier.email || '-'}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label"><i class="fas fa-map-marker-alt"></i> ที่อยู่:</div>
                        <div class="info-value">${supplier.address || '-'}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label"><i class="fas fa-id-card"></i> เลขภาษี:</div>
                        <div class="info-value">${supplier.tax_id || supplier.taxId || '-'}</div>
                    </div>
                    
                    <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span class="product-count">
                            <i class="fas fa-box"></i> ${productCount} สินค้า
                        </span>
                        <button class="btn btn-sm btn-primary" onclick="viewSupplierProducts('${supplier.code}')">
                            <i class="fas fa-eye"></i> ดูสินค้า
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

// ค้นหาซัพพลายเออร์
function searchSuppliers() {
    displaySuppliers();
}

// ล้างการค้นหา
function clearSearch() {
    document.getElementById('searchInput').value = '';
    displaySuppliers();
}

// ไฮไลท์ซัพพลายเออร์ที่เลือก
function highlightSupplier(code) {
    const card = document.querySelector(`.supplier-card[data-code="${code}"]`);
    if (card) {
        card.style.border = '3px solid #f39c12';
        card.style.transform = 'scale(1.02)';
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            card.style.border = 'none';
            card.style.transform = '';
        }, 3000);
    }
}

// แสดง modal เพิ่มซัพพลายเออร์
function showAddSupplierModal() {
    document.getElementById('modalTitle').textContent = 'เพิ่มซัพพลายเออร์';
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = '';
    
    // สร้างรหัสอัตโนมัติ
    const nextCode = generateSupplierCode();
    document.getElementById('supplierCode').value = nextCode;
    
    document.getElementById('supplierModal').style.display = 'flex';
}

// แก้ไขซัพพลายเออร์
function editSupplier(code) {
    const supplier = suppliers.find(s => s.code === code);
    if (!supplier) return;
    
    document.getElementById('modalTitle').textContent = 'แก้ไขซัพพลายเออร์';
    document.getElementById('supplierId').value = code;
    document.getElementById('supplierCode').value = supplier.code;
    document.getElementById('supplierName').value = supplier.name;
    document.getElementById('contactPerson').value = supplier.contact_person || supplier.contact || '';
    document.getElementById('phone').value = supplier.phone || '';
    document.getElementById('email').value = supplier.email || '';
    document.getElementById('address').value = supplier.address || '';
    document.getElementById('taxId').value = supplier.tax_id || supplier.taxId || '';
    
    document.getElementById('supplierModal').style.display = 'flex';
}

// ลบซัพพลายเออร์
async function deleteSupplier(code) {
    if (!confirm(`คุณแน่ใจว่าต้องการลบซัพพลายเออร์ ${code}?`)) return;
    
    // ตรวจสอบว่ามีล็อตที่ใช้ซัพพลายเออร์นี้หรือไม่
    let hasLots = false;
    if (allLots && typeof allLots === 'object') {
        for (const productLots of Object.values(allLots)) {
            if (productLots.some(lot => (lot.supplier_code || lot.supplierCode) === code)) {
                hasLots = true;
                break;
            }
        }
    }
    
    if (hasLots) {
        if (!confirm('ซัพพลายเออร์นี้มีล็อตสินค้าอยู่ในระบบ การลบอาจทำให้ข้อมูลไม่สมบูรณ์ ต้องการลบต่อหรือไม่?')) {
            return;
        }
    }
    
    try {
        if (window.electronAPI) {
            // TODO: implement deleteSupplier in database.js
        }
        
        // ลบจาก array
        suppliers = suppliers.filter(s => s.code !== code);
        
        // อัพเดท localStorage
        localStorage.setItem('suppliers', JSON.stringify(suppliers));
        
        // ส่ง event ไปยังหน้าอื่น
        window.dispatchEvent(new CustomEvent('supplierUpdated'));
        
        showAlert('ลบซัพพลายเออร์เรียบร้อย', 'success');
        updateStatistics();
        displaySuppliers();
        
    } catch (error) {
        console.error('Error deleting supplier:', error);
        showAlert('เกิดข้อผิดพลาดในการลบซัพพลายเออร์', 'danger');
    }
}

// บันทึกซัพพลายเออร์
async function saveSupplier() {
    const supplierId = document.getElementById('supplierId').value;
    
    const supplierData = {
        code: document.getElementById('supplierCode').value.trim(),
        name: document.getElementById('supplierName').value.trim(),
        contact_person: document.getElementById('contactPerson').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        tax_id: document.getElementById('taxId').value.trim()
    };
    
    // ตรวจสอบข้อมูล
    if (!supplierData.code) {
        showAlert('กรุณากรอกรหัสซัพพลายเออร์', 'warning');
        return;
    }
    
    if (!supplierData.name) {
        showAlert('กรุณากรอกชื่อบริษัท', 'warning');
        return;
    }
    
    // ตรวจสอบรหัสซ้ำ
    if (supplierId === '') {
        const exists = suppliers.some(s => s.code === supplierData.code);
        if (exists) {
            showAlert('รหัสซัพพลายเออร์นี้มีอยู่ในระบบแล้ว', 'danger');
            return;
        }
    }
    
    try {
        if (supplierId === '') {
            // เพิ่มใหม่
            if (window.electronAPI) {
                await window.electronAPI.createSupplier?.(supplierData);
            }
            
            suppliers.push(supplierData);
            
        } else {
            // แก้ไข
            const index = suppliers.findIndex(s => s.code === supplierId);
            if (index !== -1) {
                suppliers[index] = supplierData;
                
                if (window.electronAPI) {
                    // TODO: implement updateSupplier in database.js
                }
            }
        }
        
        // อัพเดท localStorage
        localStorage.setItem('suppliers', JSON.stringify(suppliers));
        
        // ส่ง event ไปยังหน้าอื่น
        window.dispatchEvent(new CustomEvent('supplierUpdated'));
        
        showAlert('บันทึกซัพพลายเออร์เรียบร้อย', 'success');
        closeModal('supplierModal');
        updateStatistics();
        displaySuppliers();
        
    } catch (error) {
        console.error('Error saving supplier:', error);
        showAlert('เกิดข้อผิดพลาดในการบันทึก', 'danger');
    }
}

// สร้างรหัสซัพพลายเออร์อัตโนมัติ
function generateSupplierCode() {
    const maxCode = suppliers.reduce((max, s) => {
        const match = s.code.match(/SUP-(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            return Math.max(max, num);
        }
        return max;
    }, 0);
    
    const nextNum = (maxCode + 1).toString().padStart(3, '0');
    return `SUP-${nextNum}`;
}

// ดูสินค้าที่มาจากซัพพลายเออร์นี้
function viewSupplierProducts(code) {
    // หาสินค้าที่มีล็อตจากซัพพลายเออร์นี้
    const productIds = new Set();
    
    if (allLots && typeof allLots === 'object') {
        Object.entries(allLots).forEach(([productId, lots]) => {
            const hasSupplier = lots.some(lot => 
                (lot.supplier_code || lot.supplierCode) === code
            );
            if (hasSupplier) {
                productIds.add(productId);
            }
        });
    }
    
    if (productIds.size === 0) {
        showAlert('ไม่มีสินค้าจากซัพพลายเออร์นี้', 'info');
        return;
    }
    
    // แสดงรายการสินค้า
    const products = allProducts.filter(p => productIds.has(p.id));
    let message = 'สินค้าจากซัพพลายเออร์นี้:\n';
    products.forEach(p => {
        message += `\n- ${p.id}: ${p.name} (${p.stock || 0} ชิ้น)`;
    });
    
    alert(message);
}

// ส่งออกรายงานซัพพลายเออร์
function exportSuppliers() {
    if (suppliers.length === 0) {
        showAlert('ไม่มีข้อมูลซัพพลายเออร์ที่จะส่งออก', 'warning');
        return;
    }
    
    const headers = ['รหัส', 'ชื่อบริษัท', 'ผู้ติดต่อ', 'เบอร์โทร', 'อีเมล', 'ที่อยู่', 'เลขภาษี'];
    const rows = [];
    
    rows.push(headers.join(','));
    
    suppliers.forEach(supplier => {
        const row = [
            `"${supplier.code}"`,
            `"${supplier.name}"`,
            `"${supplier.contact_person || supplier.contact || ''}"`,
            `"${supplier.phone || ''}"`,
            `"${supplier.email || ''}"`,
            `"${(supplier.address || '').replace(/"/g, '""')}"`,
            `"${supplier.tax_id || supplier.taxId || ''}"`
        ];
        rows.push(row.join(','));
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suppliers_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showAlert('ส่งออกรายงานเรียบร้อย', 'success');
}

// ฟังการเปลี่ยนแปลงจากหน้าอื่น
window.addEventListener('stockUpdated', () => {
    // โหลดข้อมูลสินค้าใหม่
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        allProducts = JSON.parse(storedProducts);
    }
});

window.addEventListener('lotUpdated', () => {
    // โหลดข้อมูลล็อตใหม่
    const storedLots = localStorage.getItem('productLots');
    if (storedLots) {
        allLots = JSON.parse(storedLots);
    }
    updateStatistics();
});