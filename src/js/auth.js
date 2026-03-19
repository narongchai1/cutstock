// src/js/auth.js - ฉบับสมบูรณ์

// ==================== ตัวแปรกลาง ====================
let currentUser = null;

// ==================== ตรวจสอบสถานะออนไลน์ ====================
async function checkOnlineStatus() {
    try {
        const isOnline = await window.electronAPI?.checkOnlineStatus() ?? navigator.onLine;
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
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> โหมดออฟไลน์';
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
        }
    }
}

// ==================== จัดการข้อมูลพนักงาน ====================
function loadStaffUsers() {
    try {
        const staffData = localStorage.getItem('staff');
        if (staffData) {
            return JSON.parse(staffData);
        }
    } catch (e) {
        console.error('Error loading staff:', e);
    }
    
    // ข้อมูลเริ่มต้น
    const defaultStaff = [
        { 
            id: '1', 
            username: 'admin', 
            password: 'admin123', 
            name: 'ผู้ดูแลระบบ', 
            role: 'admin', 
            email: 'admin@example.com', 
            phone: '0812345678',
            active: true,
            createdAt: new Date().toISOString()
        },
        { 
            id: '2', 
            username: 'manager', 
            password: 'manager123', 
            name: 'ผู้จัดการ', 
            role: 'admin', 
            email: 'manager@example.com', 
            phone: '0823456789',
            active: true,
            createdAt: new Date().toISOString()
        },
        { 
            id: '3', 
            username: 'staff1', 
            password: 'staff123', 
            name: 'พนักงานขาย 1', 
            role: 'staff', 
            email: 'staff1@example.com', 
            phone: '0834567890',
            active: true,
            createdAt: new Date().toISOString()
        },
        { 
            id: '4', 
            username: 'staff2', 
            password: 'staff456', 
            name: 'พนักงานขาย 2', 
            role: 'staff', 
            email: 'staff2@example.com', 
            phone: '0845678901',
            active: true,
            createdAt: new Date().toISOString()
        }
    ];
    
    localStorage.setItem('staff', JSON.stringify(defaultStaff));
    return defaultStaff;
}

// ==================== ตรวจสอบสิทธิ์การเข้าถึงหน้า ====================
function checkPageAccess() {
    // ไม่ต้องตรวจสอบหน้า login
    if (window.location.pathname.includes('index.html')) {
        return true;
    }
    
    const user = getCurrentUser();
    
    // ถ้าไม่มีผู้ใช้ ให้ไปหน้า login
    if (!user) {
        console.log('⚠️ No user found, redirecting to login');
        window.location.href = 'index.html';
        return false;
    }
    
    const currentPage = window.location.pathname.split('/').pop();
    console.log('📄 Current page:', currentPage, 'Role:', user.role);
    
    // ถ้าเป็นพนักงาน ต้องอยู่แค่หน้า sales.html เท่านั้น
    if (user.role === 'staff') {
        // อนุญาตให้เข้าได้เฉพาะ sales.html เท่านั้น
        if (currentPage !== 'sales.html' && currentPage !== '') {
            console.log('🚫 Staff cannot access', currentPage);
            window.location.href = 'sales.html';
            return false;
        }
    }
    
    // ถ้าเป็น admin เข้าได้ทุกหน้า
    return true;
}

// ==================== ดึงข้อมูลผู้ใช้ปัจจุบัน ====================
function getCurrentUser() {
    try {
        const user = localStorage.getItem('user');
        if (user) {
            return JSON.parse(user);
        }
    } catch (e) {
        console.error('Error parsing user:', e);
    }
    return null;
}

// ==================== ตรวจสอบว่าเป็น admin หรือไม่ ====================
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// ==================== ตรวจสอบว่าเป็น staff หรือไม่ ====================
function isStaff() {
    const user = getCurrentUser();
    return user && user.role === 'staff';
}

// ==================== ออกจากระบบ ====================
function logout() {
    if (confirm('คุณแน่ใจว่าต้องการออกจากระบบ?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }
}

// ==================== แสดงข้อความแจ้งเตือน ====================
function showAlert(message, type = 'info') {
    const alertId = 'alert-' + Date.now();
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        background: ${type === 'success' ? '#d4edda' : type === 'danger' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'danger' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'danger' ? '#f5c6cb' : '#bee5eb'};
    `;
    
    const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle';
    
    alertElement.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; color: inherit;">
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

// ==================== ตรวจสอบทุกครั้งที่โหลดหน้า ====================
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบสิทธิ์ทุกหน้า ยกเว้นหน้า login
    if (!window.location.pathname.includes('index.html')) {
        checkPageAccess();
    }
});

// ==================== ทำให้ฟังก์ชันใช้งานได้ทั่วโลก ====================
window.getCurrentUser = getCurrentUser;
window.isAdmin = isAdmin;
window.isStaff = isStaff;
window.logout = logout;
window.showAlert = showAlert;
window.checkOnlineStatus = checkOnlineStatus;
window.updateOnlineStatus = updateOnlineStatus;
window.loadStaffUsers = loadStaffUsers;