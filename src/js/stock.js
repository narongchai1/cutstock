// ตรวจสอบสถานะการเข้าสู่ระบบ
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return JSON.parse(user);
}

// แสดง Alert
function showAlert(message, type = 'info') {
    // สร้าง element alert ถ้ายังไม่มี
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        alertContainer.style.maxWidth = '400px';
        document.body.appendChild(alertContainer);
    }
    
    const alertId = 'alert-' + Date.now();
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
        <button class="btn-close" onclick="document.getElementById('${alertId}').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // ลบ alert อัตโนมัติหลังจาก 5 วินาที
    setTimeout(() => {
        if (document.getElementById(alertId)) {
            document.getElementById(alertId).remove();
        }
    }, 5000);
}

// จัดรูปแบบเงิน
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

// แสดงสถานะสินค้า
function getStatusBadge(status, stock) {
    let badgeClass = 'badge-secondary';
    let badgeText = status;
    
    if (status === 'มีสินค้า' || (stock > 0 && !status)) {
        badgeClass = 'badge-success';
        badgeText = 'มีสินค้า';
    } else if (status === 'สินค้าหมด' || (stock === 0 && !status)) {
        badgeClass = 'badge-danger';
        badgeText = 'สินค้าหมด';
    } else if (status === 'สินค้าจำกัด' || (stock > 0 && stock <= 10 && !status)) {
        badgeClass = 'badge-warning';
        badgeText = 'สินค้าจำกัด';
    }
    
    return `<span class="badge ${badgeClass}">${badgeText}</span>`;
}

// แสดงข้อมูลสินค้าในตาราง
function displayProducts(products) {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">ไม่มีข้อมูลสินค้า</td>
            </tr>
        `;
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.barcode || '-'}</td>
            <td>${product.name}</td>
            <td class="text-right">${formatCurrency(product.price)}</td>
            <td class="text-right">${formatCurrency(product.cost)}</td>
            <td class="text-right">${product.stock || 0}</td>
            <td>${product.category || '-'} ${product.subcategory ? '> ' + product.subcategory : ''}</td>
            <td>${getStatusBadge(product.status, product.stock)}</td>
            <td>
                <button class="btn btn-sm btn-warning btn-edit" data-id="${product.id}">
                    <i class="fas fa-edit"></i> แก้ไข
                </button>
                <button class="btn btn-sm btn-danger btn-delete" data-id="${product.id}">
                    <i class="fas fa-trash"></i> ลบ
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // เพิ่ม event listener ให้ปุ่มแก้ไขและลบ
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// แก้ไขสินค้า
async function editProduct(productId) {
    try {
        // ใช้ API ใหม่ getProduct แทนการ filter จาก getProducts
        const product = await window.electronAPI.getProduct(productId);
        
        if (product) {
            // บันทึกสินค้าที่จะแก้ไขใน sessionStorage
            sessionStorage.setItem('editProduct', JSON.stringify(product));
            
            // ไปยังหน้าแก้ไขสินค้า
            window.location.href = 'edit-product.html';
        } else {
            showAlert('ไม่พบข้อมูลสินค้าที่ต้องการแก้ไข', 'danger');
        }
    } catch (error) {
        console.error('Error in editProduct:', error);
        showAlert('เกิดข้อผิดพลาดในการแก้ไขสินค้า', 'danger');
    }
}

// ลบสินค้า
async function deleteProduct(productId) {
    if (confirm('คุณแน่ใจว่าต้องการลบสินค้านี้?')) {
        try {
            const result = await window.electronAPI.deleteProduct(productId);
            
            if (result.success) {
                showAlert('ลบสินค้าเรียบร้อยแล้ว', 'success');
                loadProducts(); // โหลดข้อมูลใหม่
            } else {
                showAlert('เกิดข้อผิดพลาดในการลบสินค้า', 'danger');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showAlert('เกิดข้อผิดพลาดในการลบสินค้า', 'danger');
        }
    }
}

// โหลดข้อมูลสินค้า
async function loadProducts(searchTerm = '') {
    try {
        const products = await window.electronAPI.getProducts(searchTerm);
        displayProducts(products);
        
        // โหลดสถิติ
        try {
            const stats = await window.electronAPI.getStatistics();
            if (stats) {
                document.getElementById('productCount').textContent = stats.total_products || products.length;
                document.getElementById('stockValue').textContent = formatCurrency(stats.total_value || 0);
                document.getElementById('lowStock').textContent = stats.low_stock || 0;
                document.getElementById('outOfStock').textContent = stats.out_of_stock || 0;
            }
        } catch (statsError) {
            console.error('Error loading statistics:', statsError);
            // ถ้าโหลดสถิติไม่ได้ ให้ใช้การคำนวณจาก products array
            document.getElementById('productCount').textContent = products.length;
            
            const totalValue = products.reduce((sum, product) => {
                const stock = product.stock || 0;
                const cost = product.cost || 0;
                return sum + (stock * cost);
            }, 0);
            
            document.getElementById('stockValue').textContent = formatCurrency(totalValue);
            
            const lowStock = products.filter(p => {
                const stock = p.stock || 0;
                return stock > 0 && stock <= 10;
            }).length;
            
            document.getElementById('lowStock').textContent = lowStock;
            
            const outOfStock = products.filter(p => {
                const stock = p.stock || 0;
                return stock === 0;
            }).length;
            
            document.getElementById('outOfStock').textContent = outOfStock;
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า', 'danger');
    }
}

// ตรวจสอบสถานะออนไลน์
async function checkOnlineStatus() {
    try {
        const isOnline = await window.electronAPI.checkOnlineStatus();
        updateOnlineStatus(isOnline);
        return isOnline;
    } catch (error) {
        console.error('Error checking online status:', error);
        return false;
    }
}

// อัพเดทแสดงสถานะออนไลน์/ออฟไลน์
function updateOnlineStatus(isOnline) {
    const statusElement = document.getElementById('onlineStatus');
    if (statusElement) {
        if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> โหมดออนไลน์';
            statusElement.classList.remove('offline');
            statusElement.classList.add('online');
            
            // แสดงเมนูออนไลน์
            document.querySelectorAll('.online-only').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> โหมดออฟไลน์';
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
            
            // ซ่อนเมนูออนไลน์
            document.querySelectorAll('.online-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }
}

// ค้นหาสินค้า
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value;
    loadProducts(searchTerm);
}

// ล้างการค้นหา
function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadProducts();
}

// Initialize เมื่อหน้าโหลด
document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuth();
    if (!user) return;
    
    // แสดงชื่อผู้ใช้
    const userElement = document.getElementById('currentUser');
    if (userElement) {
        userElement.textContent = user.name;
    }
    
    // โหลดข้อมูลสินค้า
    loadProducts();
    
    // ตรวจสอบสถานะออนไลน์
    checkOnlineStatus();
    
    // ฟังการเปลี่ยนสถานะเครือข่าย
    if (window.electronAPI && window.electronAPI.onOnlineStatusChange) {
        window.electronAPI.onOnlineStatusChange((isOnline) => {
            updateOnlineStatus(isOnline);
        });
    }
    
    // เพิ่ม event listener สำหรับการค้นหาแบบ real-time
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts();
            }, 500); // ค้นหาหลังจากพิมพ์หยุด 0.5 วินาที
        });
    }
});