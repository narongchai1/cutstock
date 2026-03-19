// sales.js - ปรับปรุง
// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentShift = null;
let allProducts = [];
let filteredProducts = [];
let cart = [];
let shiftSales = [];
let selectedCategory = 'all';
let selectedPaymentMethod = 'cash';
let vatType = 'exclude';
let categories = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing sales page...');
    
    // ตรวจสอบการเข้าสู่ระบบ
    if (!checkAuth()) return;
    
    // ตรวจสอบสถานะออนไลน์
    await checkOnlineStatus();
    
    // โหลดสินค้า
    await loadProducts();
    
    // ตรวจสอบกะที่เปิดอยู่
    await checkCurrentShift();
    
    // ตั้งค่าวันที่เริ่มต้น
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('transferDate')) {
        document.getElementById('transferDate').value = today;
    }
    
    // ตั้งค่า event listeners
    setupEventListeners();
    
    // ซ่อนเมนูสำหรับพนักงาน
    if (currentUser && currentUser.role === 'staff') {
        hideAdminMenus();
    }
    
    console.log('✅ Sales page initialized');
});

function setupEventListeners() {
    // ค้นหาด้วย Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchProducts, 500));
    }
    
    // ฟอร์มเปิดกะ
    const openShiftForm = document.getElementById('openShiftForm');
    if (openShiftForm) {
        openShiftForm.addEventListener('submit', function(e) {
            e.preventDefault();
            openShift();
        });
    }
    
    // VAT type change
    document.querySelectorAll('input[name="vatType"]').forEach(radio => {
        radio.addEventListener('change', updateVATType);
    });
    
    // VAT rate change
    const vatRate = document.getElementById('vatRate');
    if (vatRate) {
        vatRate.addEventListener('change', updateCartDisplay);
    }
    
    // ปิด modal เมื่อคลิก outside
    window.addEventListener('click', function(event) {
        const modals = ['paymentModal', 'receiptModal', 'openShiftModal', 'closeShiftModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ==================== AUTHENTICATION ====================
function checkAuth() {
    const user = localStorage.getItem('user');
    
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(user);
        
        // แสดงชื่อผู้ใช้และ role
        const userElement = document.getElementById('currentUser');
        if (userElement) {
            userElement.textContent = currentUser.name || currentUser.username || 'พนักงาน';
        }
        
        const roleElement = document.getElementById('currentRole');
        if (roleElement) {
            roleElement.textContent = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย';
            roleElement.className = currentUser.role === 'admin' ? 'badge badge-primary' : 'badge badge-success';
        }
        
        // ซ่อนเมนูสำหรับพนักงาน
        if (currentUser.role === 'staff') {
            document.querySelectorAll('.online-only').forEach(el => el.style.display = 'none');
        }
        
        return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// ซ่อนเมนูสำหรับพนักงาน
function hideAdminMenus() {
    // ซ่อนปุ่มจัดการสต็อกใน navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && (
            onclickAttr.includes('stock.html') || 
            onclickAttr.includes('add-product.html') || 
            onclickAttr.includes('lots.html') || 
            onclickAttr.includes('suppliers.html')
        )) {
            btn.style.display = 'none';
        }
    });
    
    // ซ่อนเมนูในระบบ
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
}

function logout() {
    if (confirm('คุณแน่ใจว่าต้องการออกจากระบบ?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

function goToStock() {
    window.location.href = 'stock.html';
}

// ==================== ONLINE STATUS ====================
async function checkOnlineStatus() {
    try {
        const isOnline = window.electronAPI ? await window.electronAPI.checkOnlineStatus() : navigator.onLine;
        updateOnlineStatus(isOnline);
        return isOnline;
    } catch (error) {
        console.error('Error checking online status:', error);
        return navigator.onLine;
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

// ==================== PRODUCT FUNCTIONS ====================
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '<div class="text-center" style="padding: 40px;"><div class="spinner"></div><p style="color: #7f8c8d; margin-top: 15px;">กำลังโหลดสินค้า...</p></div>';
    
    try {
        // โหลดข้อมูลจาก database
        if (window.electronAPI) {
            allProducts = await window.electronAPI.getProducts();
            console.log(`📦 Loaded ${allProducts.length} products from database`);
        }
        
        // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลตัวอย่าง
        if (!allProducts || allProducts.length === 0) {
            allProducts = getSampleProducts();
            console.log('📦 Using sample products');
        }
        
        // กรองเฉพาะสินค้าที่มีสถานะ active
        filteredProducts = allProducts.filter(p => p.status === 'active' || !p.status);
        
        // โหลดหมวดหมู่
        loadCategories();
        
        // แสดงสินค้า
        displayProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<div class="text-center" style="padding: 40px; color: #e74c3c;"><i class="fas fa-exclamation-circle fa-3x"></i><p style="margin-top: 15px;">ไม่สามารถโหลดสินค้าได้</p></div>';
        showAlert('เกิดข้อผิดพลาดในการโหลดสินค้า', 'danger');
    }
}

function getSampleProducts() {
    return [
        { id: 'P001', name: 'ข้าวสารหอมมะลิ 5กก.', price: 250, stock: 50, unit: 'ถุง', category: 'อาหาร', status: 'active', barcode: '8851234567890' },
        { id: 'P002', name: 'น้ำปลาตราปลาหมึก 750ml', price: 45, stock: 100, unit: 'ขวด', category: 'เครื่องปรุง', status: 'active', barcode: '8851234567891' },
        { id: 'P003', name: 'น้ำมันพืช 1ลิตร', price: 65, stock: 75, unit: 'ขวด', category: 'เครื่องปรุง', status: 'active', barcode: '8851234567892' },
        { id: 'P004', name: 'ไข่ไก่ เบอร์2 แผง 30ฟอง', price: 120, stock: 30, unit: 'แผง', category: 'อาหาร', status: 'active', barcode: '8851234567893' },
        { id: 'P005', name: 'นมสด ตรามะลิ 1ลิตร', price: 55, stock: 40, unit: 'กล่อง', category: 'เครื่องดื่ม', status: 'active', barcode: '8851234567894' },
        { id: 'P006', name: 'น้ำดื่ม 6ลิตร', price: 45, stock: 60, unit: 'แพ็ค', category: 'เครื่องดื่ม', status: 'active', barcode: '8851234567895' },
        { id: 'P007', name: 'บะหมี่กึ่งสำเร็จรูป 10ห่อ', price: 65, stock: 80, unit: 'แพ็ค', category: 'อาหาร', status: 'active', barcode: '8851234567896' },
        { id: 'P008', name: 'ผงซักฟอก 3กก.', price: 180, stock: 25, unit: 'ถุง', category: 'ของใช้', status: 'active', barcode: '8851234567897' },
        { id: 'P009', name: 'น้ำยาล้างจาน 750ml', price: 55, stock: 45, unit: 'ขวด', category: 'ของใช้', status: 'active', barcode: '8851234567898' },
        { id: 'P010', name: 'ยาสีฟัน 150g', price: 75, stock: 50, unit: 'หลอด', category: 'ของใช้', status: 'active', barcode: '8851234567899' },
    ];
}

function loadCategories() {
    categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    
    const categoriesHtml = document.getElementById('categories');
    if (!categoriesHtml) return;
    
    let html = '<button class="category-btn active" onclick="filterByCategory(\'all\')">ทั้งหมด</button>';
    
    categories.forEach(category => {
        html += `<button class="category-btn" onclick="filterByCategory('${category}')">${category}</button>`;
    });
    
    categoriesHtml.innerHTML = html;
}

function filterByCategory(category) {
    selectedCategory = category;
    
    // อัพเดท active state
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === (category === 'all' ? 'ทั้งหมด' : category)) {
            btn.classList.add('active');
        }
    });
    
    applyFilters();
}

function searchProducts() {
    applyFilters();
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    filteredProducts = allProducts.filter(product => {
        // กรองตามสถานะ active เท่านั้น
        if (product.status && product.status !== 'active') return false;
        
        // กรองตามหมวดหมู่
        if (selectedCategory !== 'all' && product.category !== selectedCategory) {
            return false;
        }
        
        // กรองตามคำค้นหา
        if (searchTerm) {
            const searchFields = [
                product.id,
                product.name,
                product.barcode
            ].filter(Boolean).map(f => f.toLowerCase());
            
            return searchFields.some(field => field.includes(searchTerm));
        }
        
        return true;
    });
    
    displayProducts();
}

function displayProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<div class="text-center" style="padding: 40px; color: #7f8c8d;"><i class="fas fa-box-open fa-3x"></i><p style="margin-top: 15px;">ไม่พบสินค้า</p></div>';
        return;
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => {
        const cartItem = cart.find(i => i.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        const stock = product.stock || 0;
        
        return `
            <div class="product-card ${stock === 0 ? 'out-of-stock' : ''} ${quantity > 0 ? 'selected' : ''}" data-id="${product.id}" onclick="addToCart('${product.id}')">
                ${quantity > 0 ? `<span class="cart-badge">${quantity}</span>` : ''}
                <div style="font-size: 11px; color: #7f8c8d; margin-bottom: 5px;">${product.id}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">฿${formatNumber(product.price || 0)}</div>
                <div class="product-stock">คงเหลือ: ${stock} ${product.unit || 'ชิ้น'}</div>
                ${stock > 0 ? `
                    <div class="quantity-controls" onclick="event.stopPropagation()">
                        <button class="quantity-btn" onclick="updateQuantity('${product.id}', ${quantity - 1})" ${quantity <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="text" class="quantity-input" value="${quantity}" onchange="updateQuantity('${product.id}', this.value)" onclick="event.stopPropagation()">
                        <button class="quantity-btn" onclick="updateQuantity('${product.id}', ${quantity + 1})" ${quantity >= stock ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                ` : '<div class="text-danger" style="margin-top: 10px;">สินค้าหมด</div>'}
            </div>
        `;
    }).join('');
}

// ==================== SHIFT FUNCTIONS ====================
async function checkCurrentShift() {
    if (!currentUser || !window.electronAPI) return;
    
    try {
        const shift = await window.electronAPI.getCurrentShift(currentUser.id);
        if (shift) {
            currentShift = shift;
            
            // โหลดประวัติการขายในกะนี้
            const sales = await window.electronAPI.getShiftSales(shift.id);
            shiftSales = sales || [];
            
            updateShiftUIOpen();
        } else {
            updateShiftUIClosed();
        }
    } catch (error) {
        console.error('Error checking current shift:', error);
        updateShiftUIClosed();
    }
}

function showOpenShiftModal() {
    document.getElementById('openingBalanceInput').value = '0';
    document.getElementById('shiftNoteInput').value = '';
    document.getElementById('openShiftModal').style.display = 'flex';
}

async function openShift() {
    if (!currentUser) {
        showAlert('ไม่พบข้อมูลผู้ใช้', 'danger');
        return;
    }
    
    const openingBalance = parseFloat(document.getElementById('openingBalanceInput').value) || 0;
    const notes = document.getElementById('shiftNoteInput').value;
    
    try {
        if (window.electronAPI) {
            const result = await window.electronAPI.openShift({
                cashier_id: currentUser.id,
                cashier_name: currentUser.name || currentUser.username,
                opening_balance: openingBalance,
                notes: notes
            });
            
            if (result && result.success) {
                currentShift = {
                    id: result.shift_id,
                    shift_number: result.shift_number,
                    cashier_id: currentUser.id,
                    cashier_name: currentUser.name || currentUser.username,
                    opened_at: result.opened_at,
                    opening_balance: openingBalance,
                    notes: notes,
                    status: 'open'
                };
                
                shiftSales = [];
                updateShiftUIOpen();
                closeModal('openShiftModal');
                showAlert('เปิดกะเรียบร้อย', 'success');
            } else {
                showAlert('เกิดข้อผิดพลาดในการเปิดกะ', 'danger');
            }
        } else {
            // โหมดทดสอบ
            currentShift = {
                id: 'SHIFT-' + Date.now(),
                shift_number: 'SHIFT-' + Date.now(),
                cashier_id: currentUser.id,
                cashier_name: currentUser.name || currentUser.username,
                opened_at: new Date().toISOString(),
                opening_balance: openingBalance,
                notes: notes,
                status: 'open'
            };
            shiftSales = [];
            updateShiftUIOpen();
            closeModal('openShiftModal');
            showAlert('เปิดกะเรียบร้อย (โหมดทดสอบ)', 'success');
        }
    } catch (error) {
        console.error('Error opening shift:', error);
        showAlert('เกิดข้อผิดพลาดในการเปิดกะ: ' + error.message, 'danger');
    }
}

function updateShiftUIOpen() {
    document.getElementById('shiftSection').className = 'shift-section';
    document.getElementById('shiftStatusText').textContent = 'เปิดกะแล้ว';
    document.getElementById('shiftNumber').textContent = currentShift.shift_number;
    document.getElementById('shiftTime').textContent = 'เวลาเปิด: ' + formatDate(currentShift.opened_at, true);
    document.getElementById('openingBalance').textContent = formatNumber(currentShift.opening_balance);
    document.getElementById('openShiftBtn').style.display = 'none';
    document.getElementById('closeShiftBtn').style.display = 'block';
    
    // แสดงปุ่มสรุปกะเมื่อเปิดกะแล้ว
    const reportBtn = document.getElementById('reportShiftBtn');
    if (reportBtn) {
        reportBtn.style.display = 'block';
    }
    
    document.getElementById('shiftSummary').style.display = 'grid';
    
    // รีเซ็ตส่วนต่าง
    document.getElementById('shiftDifference').textContent = formatCurrency(0);
    updateShiftSummary();
}

function updateShiftUIClosed() {
    document.getElementById('shiftSection').className = 'shift-section closed';
    document.getElementById('shiftStatusText').textContent = 'ยังไม่ได้เปิดกะ';
    document.getElementById('shiftNumber').textContent = '-';
    document.getElementById('shiftTime').textContent = '-';
    document.getElementById('openingBalance').textContent = '0.00';
    document.getElementById('openShiftBtn').style.display = 'block';
    document.getElementById('closeShiftBtn').style.display = 'none';
    
    // ซ่อนปุ่มสรุปกะเมื่อปิดกะแล้ว
    const reportBtn = document.getElementById('reportShiftBtn');
    if (reportBtn) {
        reportBtn.style.display = 'none';
    }
    
    document.getElementById('shiftSummary').style.display = 'none';
}

function updateShiftSummary() {
    if (!currentShift) return;
    
    const totalSales = shiftSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    document.getElementById('shiftSalesCount').textContent = shiftSales.length;
    document.getElementById('shiftTotalSales').textContent = formatCurrency(totalSales);
}

// ฟังก์ชันเปิดหน้าสรุปกะ (สำหรับพนักงาน)
function openShiftReport() {
    if (!currentShift) {
        showAlert('กรุณาเปิดกะก่อน', 'warning');
        return;
    }
    
    // บันทึกข้อมูลกะและยอดขายลง localStorage เพื่อให้หน้าสรุปเรียกใช้ได้
    localStorage.setItem('currentShift', JSON.stringify(currentShift));
    localStorage.setItem('shiftSales', JSON.stringify(shiftSales));
    
    // เปิดหน้าสรุปกะในหน้าต่างใหม่
    const reportWindow = window.open('shift-report.html', '_blank');
    if (!reportWindow) {
        showAlert('กรุณาอนุญาตให้เปิด Pop-up', 'warning');
    }
}

async function showCloseShiftModal() {
    if (!currentShift) {
        showAlert('ไม่พบข้อมูลกะ', 'warning');
        return;
    }
    
    try {
        // โหลดข้อมูลการขายล่าสุด
        if (window.electronAPI) {
            const sales = await window.electronAPI.getShiftSales(currentShift.id);
            shiftSales = sales || [];
        }
        
        // คำนวณยอดขาย
        const totalSales = shiftSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const cashSales = shiftSales.filter(s => s.payment_method === 'cash').reduce((sum, sale) => sum + (sale.total || 0), 0);
        const transferSales = shiftSales.filter(s => s.payment_method === 'transfer').reduce((sum, sale) => sum + (sale.total || 0), 0);
        const cardSales = shiftSales.filter(s => s.payment_method === 'card').reduce((sum, sale) => sum + (sale.total || 0), 0);
        const qrSales = shiftSales.filter(s => s.payment_method === 'qr').reduce((sum, sale) => sum + (sale.total || 0), 0);
        
        const expectedBalance = (currentShift.opening_balance || 0) + totalSales;
        
        // ตั้งค่าเริ่มต้น
        document.getElementById('closingBalance').value = expectedBalance.toFixed(2);
        document.getElementById('expenses').value = '0';
        document.getElementById('cashDrop').value = '0';
        document.getElementById('closeNotes').value = '';
        
        // อัพเดทข้อมูลในตารางสรุป
        document.getElementById('summaryOpenDate').textContent = formatDate(currentShift.opened_at, true);
        document.getElementById('summaryCloseDate').textContent = formatDate(new Date(), true);
        document.getElementById('summaryShiftRef').textContent = currentShift.shift_number;
        document.getElementById('summaryCashier').textContent = currentShift.cashier_name;
        document.getElementById('summaryOpeningBal').textContent = formatCurrency(currentShift.opening_balance || 0);
        
        document.getElementById('summaryTotalSales').textContent = formatCurrency(totalSales);
        document.getElementById('summaryCashSales').textContent = formatCurrency(cashSales);
        document.getElementById('summaryTransferSales').textContent = formatCurrency(transferSales);
        document.getElementById('summaryCardSales').textContent = formatCurrency(cardSales);
        document.getElementById('summaryQRSales').textContent = formatCurrency(qrSales);
        
        calculateShiftDifference();
        
        document.getElementById('closeShiftModal').style.display = 'flex';
    } catch (error) {
        console.error('Error showing close shift modal:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลกะ', 'danger');
    }
}

function calculateShiftDifference() {
    if (!currentShift) return;
    
    const totalSales = shiftSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const expected = (currentShift.opening_balance || 0) + totalSales;
    
    const closing = parseFloat(document.getElementById('closingBalance').value) || 0;
    const expenses = parseFloat(document.getElementById('expenses').value) || 0;
    const cashDrop = parseFloat(document.getElementById('cashDrop').value) || 0;
    
    const totalCash = closing;
    const finalBalance = closing - cashDrop;
    const difference = finalBalance - (expected - expenses);
    
    document.getElementById('summaryExpenses').textContent = formatCurrency(expenses);
    document.getElementById('summaryCashDrop').textContent = formatCurrency(cashDrop);
    document.getElementById('summaryTotalCash').textContent = formatCurrency(totalCash);
    document.getElementById('summaryExpected').textContent = formatCurrency(expected - expenses);
    document.getElementById('summaryDifference').textContent = formatCurrency(difference);
    document.getElementById('summaryDifference').className = difference >= 0 ? 'text-success' : 'text-danger';
}

async function confirmCloseShift() {
    if (!currentShift) {
        showAlert('ไม่พบข้อมูลกะ', 'warning');
        return;
    }
    
    const closingBalance = parseFloat(document.getElementById('closingBalance').value) || 0;
    const expenses = parseFloat(document.getElementById('expenses').value) || 0;
    const cashDrop = parseFloat(document.getElementById('cashDrop').value) || 0;
    const notes = document.getElementById('closeNotes').value;
    
    const totalSales = shiftSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const expectedBalance = (currentShift.opening_balance || 0) + totalSales;
    const finalBalance = closingBalance - cashDrop;
    const difference = finalBalance - (expectedBalance - expenses);
    
    const closingData = {
        shift_id: currentShift.id,
        closing_balance: closingBalance,
        expenses: expenses,
        cash_drop: cashDrop,
        notes: notes,
        total_sales_count: shiftSales.length,
        total_sales_amount: totalSales,
        expected_balance: expectedBalance,
        difference: difference
    };
    
    try {
        if (window.electronAPI) {
            const result = await window.electronAPI.closeShift(currentShift.id, closingData);
            
            if (result && result.success) {
                // แสดงสรุปการปิดกะ
                showShiftSummaryReport({
                    ...currentShift,
                    ...closingData,
                    closed_at: new Date().toISOString()
                });
                
                // อัพเดท UI
                updateShiftUIClosed();
                
                // เคลียร์ข้อมูลกะ
                currentShift = null;
                shiftSales = [];
                
                closeModal('closeShiftModal');
                showAlert('ปิดกะเรียบร้อย', 'success');
            } else {
                showAlert('เกิดข้อผิดพลาดในการปิดกะ', 'danger');
            }
        } else {
            // โหมดทดสอบ
            showShiftSummaryReport({
                ...currentShift,
                ...closingData,
                closed_at: new Date().toISOString()
            });
            
            updateShiftUIClosed();
            currentShift = null;
            shiftSales = [];
            closeModal('closeShiftModal');
            showAlert('ปิดกะเรียบร้อย (โหมดทดสอบ)', 'success');
        }
    } catch (error) {
        console.error('Error closing shift:', error);
        showAlert('เกิดข้อผิดพลาดในการปิดกะ: ' + error.message, 'danger');
    }
}

function showShiftSummaryReport(shiftData) {
    const salesByMethod = {
        cash: shiftSales.filter(s => s.payment_method === 'cash').reduce((sum, sale) => sum + (sale.total || 0), 0),
        transfer: shiftSales.filter(s => s.payment_method === 'transfer').reduce((sum, sale) => sum + (sale.total || 0), 0),
        card: shiftSales.filter(s => s.payment_method === 'card').reduce((sum, sale) => sum + (sale.total || 0), 0),
        qr: shiftSales.filter(s => s.payment_method === 'qr').reduce((sum, sale) => sum + (sale.total || 0), 0)
    };
    
    const summaryHTML = `
        <html>
        <head>
            <title>สรุปยอดกะ</title>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: 'Sarabun', 'Segoe UI', sans-serif; 
                    padding: 20px; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: #f5f7fa;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                h2 { 
                    color: #2c3e50; 
                    text-align: center;
                    margin-bottom: 20px;
                    font-size: 24px;
                }
                .shift-number {
                    text-align: center;
                    color: #7f8c8d;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0;
                }
                td { 
                    padding: 12px; 
                    border: 1px solid #ddd; 
                }
                td:first-child { 
                    font-weight: 600; 
                    background: #f8f9fa; 
                    width: 40%; 
                }
                td:last-child { 
                    text-align: right; 
                }
                .section-header {
                    background: #e9ecef;
                    font-weight: bold;
                    text-align: center;
                    font-size: 16px;
                }
                .text-success { 
                    color: #2ecc71; 
                    font-weight: bold;
                }
                .text-danger { 
                    color: #e74c3c; 
                    font-weight: bold;
                }
                .total-row {
                    background: #e8f5e9;
                    font-weight: bold;
                    font-size: 16px;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #ddd;
                    text-align: center;
                }
                .signature {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 30px;
                }
                .signature-line {
                    width: 200px;
                    border-bottom: 2px solid #333;
                    margin-top: 40px;
                }
                @media print {
                    .no-print { display: none; }
                    body { background: white; }
                }
                .print-button {
                    text-align: center;
                    margin: 20px 0;
                }
                button {
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                }
                button:hover {
                    background: #2980b9;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="print-button no-print">
                    <button onclick="window.print()">🖨️ พิมพ์สรุปยอดกะ</button>
                </div>
                
                <h2>📊 สรุปยอดกะ</h2>
                <div class="shift-number">กะที่: ${shiftData.shift_number}</div>
                
                <table>
                    <tr>
                        <td>📅 วันที่เปิดกะ:</td>
                        <td>${formatDate(shiftData.opened_at, true)}</td>
                    </tr>
                    <tr>
                        <td>📅 วันที่ปิดกะ:</td>
                        <td>${formatDate(shiftData.closed_at, true)}</td>
                    </tr>
                    <tr>
                        <td>👤 พนักงาน:</td>
                        <td>${shiftData.cashier_name}</td>
                    </tr>
                    <tr>
                        <td>💰 เงินต้นกะ:</td>
                        <td>${formatCurrency(shiftData.opening_balance || 0)}</td>
                    </tr>
                    
                    <tr>
                        <td colspan="2" class="section-header">📈 ยอดขายแยกตามช่องทาง</td>
                    </tr>
                    <tr>
                        <td>ยอดขายรวม:</td>
                        <td>${formatCurrency(shiftData.total_sales_amount || 0)}</td>
                    </tr>
                    <tr>
                        <td>💰 เงินสด:</td>
                        <td>${formatCurrency(salesByMethod.cash)}</td>
                    </tr>
                    <tr>
                        <td>🏦 โอนเงิน:</td>
                        <td>${formatCurrency(salesByMethod.transfer)}</td>
                    </tr>
                    <tr>
                        <td>💳 บัตรเครดิต:</td>
                        <td>${formatCurrency(salesByMethod.card)}</td>
                    </tr>
                    <tr>
                        <td>📱 QR Code:</td>
                        <td>${formatCurrency(salesByMethod.qr)}</td>
                    </tr>
                    
                    <tr>
                        <td colspan="2" class="section-header">💵 รายการเคลื่อนไหว</td>
                    </tr>
                    <tr>
                        <td>ค่าใช้จ่ายอื่นๆ:</td>
                        <td class="text-danger">${formatCurrency(shiftData.expenses || 0)}</td>
                    </tr>
                    <tr>
                        <td>นำเงินเข้าร้าน:</td>
                        <td class="text-success">${formatCurrency(shiftData.cash_drop || 0)}</td>
                    </tr>
                    <tr>
                        <td>เงินคงเหลือในเคาน์เตอร์:</td>
                        <td>${formatCurrency(shiftData.closing_balance || 0)}</td>
                    </tr>
                    <tr>
                        <td>เงินคงเหลือหลังหักนำเข้า:</td>
                        <td>${formatCurrency((shiftData.closing_balance || 0) - (shiftData.cash_drop || 0))}</td>
                    </tr>
                    <tr>
                        <td>ยอดที่คาดหวัง:</td>
                        <td>${formatCurrency((shiftData.expected_balance || 0) - (shiftData.expenses || 0))}</td>
                    </tr>
                    <tr class="total-row">
                        <td>📌 ส่วนต่าง:</td>
                        <td class="${(shiftData.difference || 0) >= 0 ? 'text-success' : 'text-danger'}">
                            ${(shiftData.difference || 0) >= 0 ? '+' : ''}${formatCurrency(Math.abs(shiftData.difference || 0))}
                        </td>
                    </tr>
                </table>
                
                ${shiftData.notes ? `<p><strong>หมายเหตุ:</strong> ${shiftData.notes}</p>` : ''}
                
                <div class="footer">
                    <div class="signature">
                        <div style="text-align: center;">
                            <div class="signature-line"></div>
                            <p style="margin-top: 10px;">พนักงาน</p>
                        </div>
                        <div style="text-align: center;">
                            <div class="signature-line"></div>
                            <p style="margin-top: 10px;">ผู้จัดการ</p>
                        </div>
                    </div>
                    <p style="color: #7f8c8d; margin-top: 30px;">ระบบจัดการสต็อก v1.0</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // เปิดหน้าต่างใหม่เพื่อแสดงสรุป
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
        reportWindow.document.write(summaryHTML);
        reportWindow.document.close();
    } else {
        // ถ้า browser บล็อก popup ให้แสดงเป็นข้อความ
        alert('กรุณาอนุญาตให้เปิด Pop-up ใน browser');
    }
}

// ==================== CART FUNCTIONS ====================
function addToCart(productId) {
    if (!currentShift) {
        showAlert('กรุณาเปิดกะก่อนขายสินค้า', 'warning');
        return;
    }
    
    const product = allProducts.find(p => p.id === productId);
    if (!product || (product.stock || 0) <= 0) return;
    
    const cartItem = cart.find(i => i.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity < (product.stock || 0)) {
            cartItem.quantity++;
        } else {
            showAlert('สินค้าไม่พอในสต็อก', 'warning');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            quantity: 1,
            stock: product.stock || 0,
            unit: product.unit || 'ชิ้น'
        });
    }
    
    updateCartDisplay();
    displayProducts();
}

function updateQuantity(productId, newQuantity) {
    if (!currentShift) {
        showAlert('กรุณาเปิดกะก่อนขายสินค้า', 'warning');
        return;
    }
    
    newQuantity = parseInt(newQuantity) || 0;
    if (newQuantity < 0) newQuantity = 0;
    
    const product = allProducts.find(p => p.id === productId);
    if (product && newQuantity > (product.stock || 0)) {
        showAlert('สินค้าไม่พอในสต็อก', 'warning');
        newQuantity = product.stock || 0;
    }
    
    const cartItem = cart.find(i => i.id === productId);
    
    if (newQuantity === 0) {
        cart = cart.filter(i => i.id !== productId);
    } else if (cartItem) {
        cartItem.quantity = newQuantity;
    } else if (product) {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            quantity: newQuantity,
            stock: product.stock || 0,
            unit: product.unit || 'ชิ้น'
        });
    }
    
    updateCartDisplay();
    displayProducts();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCartDisplay();
    displayProducts();
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('คุณแน่ใจว่าต้องการล้างตะกร้าสินค้าทั้งหมด?')) {
        cart = [];
        updateCartDisplay();
        displayProducts();
        showAlert('ล้างตะกร้าเรียบร้อย', 'success');
    }
}

function calculateVAT(subtotal) {
    const rate = parseFloat(document.getElementById('vatRate').value) || 0;
    
    if (vatType === 'exclude') {
        const tax = subtotal * rate / 100;
        return {
            subtotal: subtotal,
            tax: tax,
            total: subtotal + tax
        };
    } else {
        const subtotalExclude = subtotal / (1 + rate / 100);
        const tax = subtotal - subtotalExclude;
        return {
            subtotal: subtotalExclude,
            tax: tax,
            total: subtotal
        };
    }
}

function updateCartDisplay() {
    const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const vat = calculateVAT(subtotal);
    
    document.getElementById('cartCount').textContent = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    document.getElementById('subtotal').textContent = formatCurrency(vat.subtotal);
    document.getElementById('tax').textContent = formatCurrency(vat.tax);
    document.getElementById('total').textContent = formatCurrency(vat.total);
    document.getElementById('vatRateDisplay').textContent = document.getElementById('vatRate').value;
    
    // แสดงรายการในตะกร้า
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>ยังไม่มีสินค้าในตะกร้า</p></div>';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div>฿${formatNumber(item.price || 0)} x ${item.quantity || 0} ${item.unit}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="cart-item-total">฿${formatNumber((item.price || 0) * (item.quantity || 0))}</span>
                <button class="btn btn-sm btn-danger" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateVATType() {
    vatType = document.querySelector('input[name="vatType"]:checked').value;
    updateCartDisplay();
}

// ==================== PAYMENT FUNCTIONS ====================
function selectPaymentMethod(method, event) {
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-method').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    if (event && event.target) {
        const methodElement = event.target.closest('.payment-method');
        if (methodElement) {
            methodElement.classList.add('selected');
        }
    }
    
    if (document.getElementById('paymentModal').style.display === 'flex') {
        updatePaymentSections();
    }
}

function updatePaymentSections() {
    const sections = ['cash', 'transfer', 'card', 'qr'];
    sections.forEach(method => {
        const section = document.getElementById(method + 'PaymentSection');
        if (section) {
            section.style.display = method === selectedPaymentMethod ? 'block' : 'none';
        }
    });
    
    // อัพเดทยอดในแต่ละ section
    const totalEl = document.getElementById('total');
    const total = parseFloat(totalEl ? totalEl.textContent.replace(/[฿,]/g, '') : 0);
    
    document.getElementById('paymentTotal').textContent = formatCurrency(total);
    document.getElementById('transferTotal').textContent = formatCurrency(total);
    document.getElementById('cardTotal').textContent = formatCurrency(total);
    document.getElementById('qrTotal').textContent = formatCurrency(total);
    
    // ตั้งค่าวันที่สำหรับโอนเงิน
    if (selectedPaymentMethod === 'transfer') {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transferDate').value = today;
    }
}

function calculateChange() {
    const totalEl = document.getElementById('paymentTotal');
    const total = parseFloat(totalEl ? totalEl.textContent.replace(/[฿,]/g, '') : 0);
    
    const received = parseFloat(document.getElementById('cashReceived').value) || 0;
    const change = Math.max(0, received - total);
    document.getElementById('changeAmount').textContent = formatCurrency(change);
}

function setCashAmount(amount) {
    const totalEl = document.getElementById('paymentTotal');
    const total = parseFloat(totalEl ? totalEl.textContent.replace(/[฿,]/g, '') : 0);
    
    const currentReceived = parseFloat(document.getElementById('cashReceived').value) || 0;
    
    if (amount === 'exact') {
        document.getElementById('cashReceived').value = total.toFixed(2);
    } else if (amount === 'round') {
        document.getElementById('cashReceived').value = (Math.ceil(total / 100) * 100).toFixed(2);
    } else {
        document.getElementById('cashReceived').value = (currentReceived + amount).toFixed(2);
    }
    
    calculateChange();
}

function checkout() {
    if (!currentShift) {
        showAlert('กรุณาเปิดกะก่อนขายสินค้า', 'warning');
        return;
    }
    
    if (cart.length === 0) {
        showAlert('ไม่มีสินค้าในตะกร้า', 'warning');
        return;
    }
    
    const totalEl = document.getElementById('total');
    const total = parseFloat(totalEl ? totalEl.textContent.replace(/[฿,]/g, '') : 0);
    
    if (total <= 0) {
        showAlert('ยอดชำระไม่ถูกต้อง', 'danger');
        return;
    }
    
    // แสดง modal ชำระเงิน
    updatePaymentSections();
    document.getElementById('paymentModal').style.display = 'flex';
    
    // รีเซ็ตค่าเงินสด
    document.getElementById('cashReceived').value = '';
    document.getElementById('changeAmount').textContent = formatCurrency(0);
    
    // Focus ที่ input เงินสด
    setTimeout(() => {
        if (selectedPaymentMethod === 'cash') {
            document.getElementById('cashReceived').focus();
        }
    }, 300);
}

async function processPayment() {
    if (!currentShift) {
        showAlert('กรุณาเปิดกะก่อนขายสินค้า', 'warning');
        closeModal('paymentModal');
        return;
    }
    
    const totalEl = document.getElementById('total');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const vatRateInput = document.getElementById('vatRate');
    
    const total = parseFloat(totalEl ? totalEl.textContent.replace(/[฿,]/g, '') : 0);
    const subtotal = parseFloat(subtotalEl ? subtotalEl.textContent.replace(/[฿,]/g, '') : 0);
    const tax = parseFloat(taxEl ? taxEl.textContent.replace(/[฿,]/g, '') : 0);
    const vatRate = vatRateInput ? parseFloat(vatRateInput.value) || 7 : 7;
    
    // ตรวจสอบข้อมูลการชำระเงิน
    if (selectedPaymentMethod === 'cash') {
        const received = parseFloat(document.getElementById('cashReceived').value) || 0;
        if (received < total) {
            showAlert('จำนวนเงินไม่พอชำระ', 'danger');
            return;
        }
    } else if (selectedPaymentMethod === 'transfer') {
        const ref = document.getElementById('transferRef');
        if (!ref || !ref.value.trim()) {
            showAlert('กรุณากรอกเลขที่อ้างอิง', 'warning');
            return;
        }
    } else if (selectedPaymentMethod === 'card') {
        const approvalCode = document.getElementById('approvalCode');
        if (!approvalCode || !approvalCode.value.trim()) {
            showAlert('กรุณากรอกเลขที่อนุมัติ', 'warning');
            return;
        }
    } else if (selectedPaymentMethod === 'qr') {
        const qrRef = document.getElementById('qrRef');
        if (!qrRef || !qrRef.value.trim()) {
            showAlert('กรุณากรอกเลขที่อ้างอิง', 'warning');
            return;
        }
    }
    
    // เตรียมข้อมูลการขาย
    const paymentDetails = {};
    
    if (selectedPaymentMethod === 'cash') {
        paymentDetails.received = parseFloat(document.getElementById('cashReceived').value) || 0;
        paymentDetails.change = parseFloat(document.getElementById('changeAmount').textContent.replace(/[฿,]/g, '')) || 0;
    } else if (selectedPaymentMethod === 'transfer') {
        paymentDetails.bank = document.getElementById('transferBank').value;
        paymentDetails.ref = document.getElementById('transferRef').value.trim();
        paymentDetails.date = document.getElementById('transferDate').value;
    } else if (selectedPaymentMethod === 'card') {
        paymentDetails.card_type = document.getElementById('cardType').value;
        paymentDetails.approval_code = document.getElementById('approvalCode').value.trim();
        paymentDetails.last4 = document.getElementById('cardLast4').value.trim();
    } else if (selectedPaymentMethod === 'qr') {
        paymentDetails.ref = document.getElementById('qrRef').value.trim();
    }
    
    const saleData = {
        shift_id: currentShift ? currentShift.id : null,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: (item.price || 0) * (item.quantity || 1)
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        payment_method: selectedPaymentMethod,
        vat_type: vatType,
        vat_rate: vatRate,
        cashier_id: currentUser ? currentUser.id : 'staff001',
        cashier_name: currentUser ? (currentUser.name || currentUser.username) : 'พนักงาน',
        payment_details: paymentDetails
    };
    
    try {
        // บันทึกการขาย
        let result = { success: true, saleId: 'SALE-' + Date.now() };
        
        if (window.electronAPI) {
            result = await window.electronAPI.saveSale(saleData);
            console.log('💾 Sale saved to database:', result);
        }
        
        if (result && result.success) {
            // อัพเดทสต็อกสินค้าใน memory
            for (const item of cart) {
                const product = allProducts.find(p => p.id === item.id);
                if (product) {
                    product.stock = (product.stock || 0) - (item.quantity || 0);
                }
            }
            
            // บันทึกการขายในกะ
            const saleRecord = {
                ...saleData,
                id: result.saleId || ('SALE-' + Date.now()),
                created_at: new Date().toISOString()
            };
            
            shiftSales.push(saleRecord);
            
            // แสดงใบเสร็จ
            showReceipt(saleRecord, result.saleId);
            
            // อัพเดทสรุปยอดกะ
            updateShiftSummary();
            
            // ล้างตะกร้า
            cart = [];
            updateCartDisplay();
            displayProducts();
            
            // ปิด modal ชำระเงิน
            closeModal('paymentModal');
            
            showAlert('บันทึกการขายเรียบร้อย', 'success');
        } else {
            showAlert('เกิดข้อผิดพลาดในการบันทึกการขาย', 'danger');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        showAlert('เกิดข้อผิดพลาดในการบันทึกการขาย: ' + error.message, 'danger');
    }
}

// ==================== RECEIPT FUNCTIONS ====================
function showReceipt(saleData, saleId) {
    const now = new Date();
    
    document.getElementById('receiptDate').textContent = formatDate(now, true);
    document.getElementById('receiptNumber').textContent = saleId || 'SALE-' + now.getTime();
    document.getElementById('receiptSubtotal').textContent = formatCurrency(saleData.subtotal || 0);
    document.getElementById('receiptTax').textContent = formatCurrency(saleData.tax || 0);
    document.getElementById('receiptTotal').textContent = formatCurrency(saleData.total || 0);
    document.getElementById('receiptVatRate').textContent = saleData.vat_rate || 7;
    document.getElementById('receiptCashier').textContent = saleData.cashier_name || 'พนักงาน';
    
    // ช่องทางการชำระเงิน
    const paymentMethods = {
        cash: 'เงินสด',
        transfer: 'โอนเงิน',
        card: 'บัตรเครดิต',
        qr: 'QR Code'
    };
    document.getElementById('receiptPaymentMethod').textContent = paymentMethods[saleData.payment_method] || saleData.payment_method;
    
    // จำนวนเงินที่รับและทอน (สำหรับเงินสด)
    if (saleData.payment_method === 'cash') {
        document.getElementById('receiptReceived').textContent = formatCurrency(saleData.payment_details?.received || 0);
        document.getElementById('receiptChange').textContent = formatCurrency(saleData.payment_details?.change || 0);
    } else {
        document.getElementById('receiptReceived').textContent = formatCurrency(saleData.total || 0);
        document.getElementById('receiptChange').textContent = formatCurrency(0);
    }
    
    // รายการสินค้า
    const receiptItems = document.getElementById('receiptItems');
    if (receiptItems) {
        receiptItems.innerHTML = (saleData.items || []).map(item => `
            <div class="receipt-item">
                <div>${item.name} x${item.quantity || 1}</div>
                <div>฿${formatNumber((item.price || 0) * (item.quantity || 1))}</div>
            </div>
        `).join('');
    }
    
    document.getElementById('receiptModal').style.display = 'flex';
}

function printReceipt() {
    const printWindow = window.open('', '_blank');
    const receiptContent = document.querySelector('.receipt-content');
    
    if (!receiptContent) return;
    
    const contentClone = receiptContent.cloneNode(true);
    
    // ลบปุ่มออกจากใบเสร็จที่จะพิมพ์
    const buttons = contentClone.querySelectorAll('div[style*="display: flex; gap: 10px; margin-top: 20px;"]');
    buttons.forEach(btn => btn.remove());
    
    printWindow.document.write(`
        <html>
        <head>
            <title>ใบเสร็จรับเงิน</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Sarabun', sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                .receipt-header { text-align: center; border-bottom: 2px dashed #ddd; padding-bottom: 20px; margin-bottom: 20px; }
                .receipt-items { margin: 15px 0; }
                .receipt-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
                .receipt-footer { border-top: 2px dashed #ddd; padding-top: 20px; margin-top: 20px; }
                .receipt-total { font-size: 18px; font-weight: bold; color: #e74c3c; margin: 10px 0; }
            </style>
        </head>
        <body>
            ${contentClone.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== UTILITY FUNCTIONS ====================
function formatNumber(num) {
    return Number(num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCurrency(amount) {
    return '฿' + formatNumber(amount || 0);
}

function formatDate(dateString, includeTime = false) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (includeTime) {
            return date.toLocaleString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function showAlert(message, type = 'info') {
    const alertId = 'alert-' + Date.now();
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span style="flex: 1; margin-left: 10px;">${message}</span>
        <button class="btn-close" onclick="document.getElementById('${alertId}').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(alertElement);
    
    setTimeout(() => {
        if (document.getElementById(alertId)) {
            document.getElementById(alertId).remove();
        }
    }, 5000);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// ==================== EXPOSE FUNCTIONS TO GLOBAL SCOPE ====================
// ทำให้ฟังก์ชันสามารถเรียกจาก HTML ได้
window.filterByCategory = filterByCategory;
window.searchProducts = searchProducts;
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.selectPaymentMethod = selectPaymentMethod;
window.calculateChange = calculateChange;
window.setCashAmount = setCashAmount;
window.checkout = checkout;
window.processPayment = processPayment;
window.printReceipt = printReceipt;
window.closeModal = closeModal;
window.showOpenShiftModal = showOpenShiftModal;
window.openShift = openShift;
window.showCloseShiftModal = showCloseShiftModal;
window.calculateShiftDifference = calculateShiftDifference;
window.confirmCloseShift = confirmCloseShift;
window.logout = logout;
window.goToStock = goToStock;
window.openShiftReport = openShiftReport;