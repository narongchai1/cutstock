// auth.js
// ตรวจสอบสถานะการเชื่อมต่อ
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
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> โหมดออฟไลน์';
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
        }
    }
}

// แสดงข้อความผิดพลาด
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // ซ่อน error หลังจาก 5 วินาที
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// จัดการฟอร์ม Login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    // ตรวจสอบสถานะการเชื่อมต่อ
    checkOnlineStatus();
    
    // ฟังการเปลี่ยนสถานะเครือข่าย
    if (window.electronAPI && window.electronAPI.onOnlineStatusChange) {
        window.electronAPI.onOnlineStatusChange((isOnline) => {
            updateOnlineStatus(isOnline);
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // ตรวจสอบข้อมูลเบื้องต้น
            if (!username || !password) {
                showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
                return;
            }
            
            // ปุ่ม login เปลี่ยนเป็นกำลังโหลด
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...';
            submitBtn.disabled = true;
            
            try {
                console.log('🔐 Attempting login for:', username);
                
                // ใช้ระบบ authentication แบบออฟไลน์โดยตรง
                const offlineUsers = [
                    { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ', role: 'admin', email: 'admin@example.com', phone: '0812345678' },
                    { username: 'manager', password: 'manager123', name: 'ผู้จัดการ', role: 'admin', email: 'manager@example.com', phone: '0823456789' },
                    { username: 'staff1', password: 'staff123', name: 'พนักงานขาย 1', role: 'staff', email: 'staff1@example.com', phone: '0834567890' },
                    { username: 'staff2', password: 'staff456', name: 'พนักงานขาย 2', role: 'staff', email: 'staff2@example.com', phone: '0845678901' }
                ];
                
                const user = offlineUsers.find(u => 
                    u.username === username && u.password === password
                );
                
                if (user) {
                    console.log('✅ Login successful for:', user.name);
                    
                    // บันทึกข้อมูลผู้ใช้
                    localStorage.setItem('user', JSON.stringify({
                        id: user.id || Date.now(),
                        username: user.username,
                        name: user.name,
                        role: user.role,
                        email: user.email,
                        phone: user.phone
                    }));
                    localStorage.setItem('token', 'offline-token-' + Date.now());
                    
                    // ตรวจสอบ role เพื่อ redirect
                    setTimeout(() => {
                        if (user.role === 'admin') {
                            // Admin ไปหน้า stock
                            window.location.href = 'stock.html';
                        } else {
                            // Staff ไปหน้า sales เท่านั้น
                            window.location.href = 'sales.html';
                        }
                    }, 500);
                } else {
                    console.log('❌ Login failed for:', username);
                    showError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            } finally {
                // คืนสถานะปุ่มหลังจาก 2 วินาที (เผื่อกรณี redirect ช้า)
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }
        });
    }
});