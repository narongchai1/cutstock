// stock.js - ใช้ Electron API จริง
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    
    const userData = JSON.parse(user);
    
    // ถ้าเป็น staff ให้ redirect ไปหน้า sales
    if (userData.role === 'staff') {
        window.location.href = 'sales.html';
        return false;
    }
    
    return userData;
}

function showAlert(message, type = 'info') {
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
    
    setTimeout(() => {
        if (document.getElementById(alertId)) {
            document.getElementById(alertId).remove();
        }
    }, 5000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

function formatNumber(num) {
    return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getStatusBadge(status, stock, minStock = 10) {
    if (stock === 0) {
        return '<span class="badge badge-danger">สินค้าหมด</span>';
    } else if (stock <= minStock) {
        return '<span class="badge badge-warning">สินค้าจำกัด</span>';
    } else {
        return '<span class="badge badge-success">มีสินค้า</span>';
    }
}

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
            <td class="text-right">฿${formatNumber(product.price)}</td>
            <td class="text-right">฿${formatNumber(product.cost)}</td>
            <td class="text-right">${product.stock || 0} ${product.unit || 'ชิ้น'}</td>
            <td>${product.category || '-'} ${product.subcategory ? '> ' + product.subcategory : ''}</td>
            <td>${getStatusBadge(product.status, product.stock, product.min_stock)}</td>
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

async function editProduct(productId) {
    try {
        const product = await window.electronAPI.getProduct(productId);
        
        if (product) {
            sessionStorage.setItem('editProduct', JSON.stringify(product));
            window.location.href = 'edit-product.html';
        } else {
            showAlert('ไม่พบข้อมูลสินค้าที่ต้องการแก้ไข', 'danger');
        }
    } catch (error) {
        console.error('Error in editProduct:', error);
        showAlert('เกิดข้อผิดพลาดในการแก้ไขสินค้า', 'danger');
    }
}

async function deleteProduct(productId) {
    if (confirm('คุณแน่ใจว่าต้องการลบสินค้านี้?')) {
        try {
            const result = await window.electronAPI.deleteProduct(productId);
            
            if (result.success) {
                showAlert('ลบสินค้าเรียบร้อยแล้ว', 'success');
                loadProducts();
            } else {
                showAlert('เกิดข้อผิดพลาดในการลบสินค้า', 'danger');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showAlert('เกิดข้อผิดพลาดในการลบสินค้า', 'danger');
        }
    }
}

async function loadProducts(searchTerm = '') {
    try {
        const products = await window.electronAPI.getProducts(searchTerm);
        displayProducts(products);
        
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
            document.getElementById('productCount').textContent = products.length;
            
            const totalValue = products.reduce((sum, product) => {
                return sum + ((product.stock || 0) * (product.cost || 0));
            }, 0);
            
            document.getElementById('stockValue').textContent = formatCurrency(totalValue);
            
            const lowStock = products.filter(p => {
                const stock = p.stock || 0;
                return stock > 0 && stock <= (p.min_stock || 10);
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

function updateOnlineStatus(isOnline) {
    const statusElement = document.getElementById('onlineStatus');
    if (statusElement) {
        if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> โหมดออนไลน์';
            statusElement.classList.remove('offline');
            statusElement.classList.add('online');
            document.querySelectorAll('.online-only').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> โหมดออฟไลน์';
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
            document.querySelectorAll('.online-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value;
    loadProducts(searchTerm);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadProducts();
}

document.addEventListener('DOMContentLoaded', function() {
    const user = checkAuth();
    if (!user) return;
    
    const userElement = document.getElementById('currentUser');
    if (userElement) {
        userElement.textContent = user.name;
    }
    
    // แสดง role
    const roleElement = document.getElementById('currentRole');
    if (roleElement) {
        roleElement.textContent = user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย';
        roleElement.className = user.role === 'admin' ? 'badge badge-primary' : 'badge badge-success';
    }
    
    loadProducts();
    checkOnlineStatus();
    
    if (window.electronAPI && window.electronAPI.onOnlineStatusChange) {
        window.electronAPI.onOnlineStatusChange((isOnline) => {
            updateOnlineStatus(isOnline);
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts();
            }, 500);
        });
    }
});