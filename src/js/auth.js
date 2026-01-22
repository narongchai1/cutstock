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
    const errorMessage = document.getElementById('errorMessage');
    
    // ตรวจสอบสถานะการเชื่อมต่อ
    checkOnlineStatus();
    
    // ฟังการเปลี่ยนสถานะเครือข่าย
    window.electronAPI.onOnlineStatusChange((isOnline) => {
        updateOnlineStatus(isOnline);
    });
    
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
            
            // ส่งข้อมูลไปยัง Main Process
            try {
                const result = await window.electronAPI.login({
                    username,
                    password
                });
                
                if (result.success) {
                    // บันทึกข้อมูลผู้ใช้
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('token', result.token || 'offline-token');
                    
                    // ไปยังหน้า Stock (แก้ไขจาก dashboard.html เป็น stock.html)
                    window.location.href = 'stock.html';
                } else {
                    showError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                }
            } catch (error) {
                console.error('Login error:', error);
                
                // ถ้า offline ให้ใช้ระบบ authentication แบบง่าย
                const isOnline = await checkOnlineStatus();
                if (!isOnline) {
                    // ตรวจสอบกับข้อมูลผู้ใช้ใน localStorage
                    const offlineUsers = [
                        { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ' },
                        { username: 'staff', password: 'staff123', name: 'พนักงาน' }
                    ];
                    
                    const user = offlineUsers.find(u => 
                        u.username === username && u.password === password
                    );
                    
                    if (user) {
                        localStorage.setItem('user', JSON.stringify(user));
                        localStorage.setItem('token', 'offline-token');
                        window.location.href = 'stock.html'; // ไปที่ stock.html
                    } else {
                        showError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (โหมดออฟไลน์)');
                    }
                } else {
                    showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                }
            } finally {
                // คืนสถานะปุ่ม
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});