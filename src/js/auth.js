// ==============================================
// ประกาศฟังก์ชันพื้นฐานก่อนใช้งานทั้งหมด
// ==============================================

// 1. ฟังก์ชันตรวจสอบว่าล็อกอินอยู่หรือไม่
function isLoggedIn() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const isLogged = !!(user && token);
    console.log('🔍 isLoggedIn check:', isLogged, { user: !!user, token: !!token });
    return isLogged;
}

// 2. ฟังก์ชันดึงข้อมูลผู้ใช้ปัจจุบัน
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// 3. ฟังก์ชันล้างข้อมูลการยืนยันตัวตน
function clearAuthData() {
    console.log('🧹 Clearing auth data...');
    
    // ล้าง localStorage ทั้งหมดที่เกี่ยวกับการยืนยันตัวตน
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastLogin');
    
    // ล้าง sessionStorage
    sessionStorage.clear();
    
    // ล้าง cookies ถ้ามี
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    console.log('✅ Cleared all auth data');
}

// 4. ฟังก์ชันตรวจสอบความถูกต้องของ token
function validateToken() {
    const token = localStorage.getItem('token');
    const lastLogin = localStorage.getItem('lastLogin');
    
    if (!token || !lastLogin) {
        return false;
    }
    
    // ตรวจสอบว่า token หมดอายุหรือไม่ (24 ชม.)
    const loginTime = new Date(lastLogin);
    const currentTime = new Date();
    const hoursDiff = (currentTime - loginTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        console.log('Token expired, clearing auth data');
        clearAuthData();
        return false;
    }
    
    return true;
}

// 5. ฟังก์ชันแสดงข้อความผิดพลาด
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

// ==============================================
// ฟังก์ชันจัดการ Login
// ==============================================

// ✅ ฟังก์ชันจำลองสำหรับทดสอบใน browser
async function mockLogin(username, password) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (username === 'admin' && password === 'admin123') {
                resolve({
                    success: true,
                    user: { username: 'admin', name: 'ผู้ดูแลระบบ', role: 'admin' },
                    token: 'mock-jwt-token-' + Date.now()
                });
            } else {
                resolve({
                    success: false,
                    message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
                });
            }
        }, 500);
    });
}

// ✅ แยกฟังก์ชัน handle login ออกมา
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    console.log('🔐 Login attempt for user:', username);
    
    // ตรวจสอบข้อมูลเบื้องต้น
    if (!username || !password) {
        showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...';
    submitBtn.disabled = true;
    
    try {
        // ✅ ตรวจสอบว่า electronAPI มีฟังก์ชัน login หรือไม่
        let result;
        if (window.electronAPI && window.electronAPI.login) {
            console.log('Using Electron login API');
            result = await window.electronAPI.login({
                username,
                password
            });
        } else {
            // Fallback สำหรับการทดสอบใน browser
            console.log('Using mock login (browser mode)');
            result = await mockLogin(username, password);
        }
        
        console.log('Login API response:', result);
        
        if (result.success) {
            console.log('✅ Login successful!');
            
            // ✅ ล้างข้อมูลเก่าก่อนบันทึกใหม่
            clearAuthData();
            
            // บันทึกข้อมูลผู้ใช้
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('token', result.token || 'offline-token-' + Date.now());
            localStorage.setItem('lastLogin', new Date().toISOString());
            
            console.log('✅ User data saved to localStorage');
            console.log('User:', result.user);
            console.log('Token:', result.token || 'offline-token');
            
            // 🔧 FIX: ใช้ location.replace() เพื่อป้องกัน history stack
            // และเพิ่ม timeout เพื่อให้ข้อมูลบันทึกเสร็จก่อน
            setTimeout(() => {
                console.log('🔄 Redirecting to stock.html using location.replace()');
                
                // ตรวจสอบว่าข้อมูลบันทึกเรียบร้อยแล้ว
                const savedUser = localStorage.getItem('user');
                const savedToken = localStorage.getItem('token');
                
                if (savedUser && savedToken) {
                    console.log('✅ Auth data verified, redirecting...');
                    
                    // ใช้ replace แทน href เพื่อป้องกันการย้อนกลับ
                    try {
                        window.location.replace('stock.html');
                    } catch (error) {
                        console.error('Replace failed, trying href...', error);
                        window.location.href = 'stock.html';
                    }
                } else {
                    console.error('❌ Auth data not saved properly!');
                    showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }, 300);
            
        } else {
            console.log('❌ Login failed:', result.message);
            showError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (error) {
        console.error('⚠️ Login error:', error);
        
        // Offline mode - ใช้ระบบ authentication แบบง่าย
        try {
            console.log('Trying offline authentication...');
            
            const offlineUsers = [
                { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ', role: 'admin' },
                { username: 'staff', password: 'staff123', name: 'พนักงาน', role: 'staff' }
            ];
            
            const user = offlineUsers.find(u => 
                u.username === username && u.password === password
            );
            
            if (user) {
                console.log('✅ Offline login successful!');
                
                // ✅ ล้างข้อมูลเก่าก่อนบันทึกใหม่
                clearAuthData();
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', 'offline-token-' + Date.now());
                localStorage.setItem('lastLogin', new Date().toISOString());
                
                console.log('✅ Offline user data saved:', user);
                
                setTimeout(() => {
                    console.log('🔄 Redirecting to stock.html from offline mode...');
                    
                    // ใช้ replace เพื่อป้องกัน loop
                    try {
                        window.location.replace('stock.html');
                    } catch (replaceError) {
                        console.error('Replace failed, trying href...', replaceError);
                        window.location.href = 'stock.html';
                    }
                }, 300);
                
            } else {
                console.log('❌ Offline login failed');
                showError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        } catch (offlineError) {
            console.error('Offline login error:', offlineError);
            showError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        }
    } finally {
        // คืนสถานะปุ่ม
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// ==============================================
// ฟังก์ชัน logout
// ==============================================

// ฟังก์ชัน logout (สำหรับเรียกใช้จากหน้าอื่น)
async function logout() {
    try {
        // ถ้ามี API ให้เรียก logout
        if (window.electronAPI && window.electronAPI.logout) {
            await window.electronAPI.logout();
        }
        
        // ✅ เรียก clearAuthData
        clearAuthData();
        
        // ✅ ใช้ replaceState เพื่อป้องกันการย้อนกลับ
        window.history.replaceState(null, null, 'index.html');
        
        // ✅ redirect ไปหน้า login พร้อมกับ timestamp เพื่อป้องกัน cache
        const timestamp = new Date().getTime();
        
        // ใช้ replace เพื่อไม่ให้สามารถย้อนกลับมาได้
        window.location.replace(`index.html?logout=${timestamp}`);
        
    } catch (error) {
        console.error('Logout error:', error);
        // ถ้ามี error ก็ยังต้องเคลียร์ข้อมูล
        clearAuthData();
        window.location.href = 'index.html';
    }
}

// ==============================================
// ฟังก์ชันตรวจสอบสถานะเครือข่าย
// ==============================================

// ฟังก์ชันตรวจสอบสถานะเครือข่าย (แบบง่าย)
function checkNetworkStatus() {
    // ตรวจสอบว่าเป็น Electron app หรือไม่
    if (window.electronAPI && typeof window.electronAPI.checkOnlineStatus === 'function') {
        // สำหรับ Electron app
        return window.electronAPI.checkOnlineStatus();
    } else {
        // สำหรับ Web browser
        return navigator.onLine;
    }
}

// ฟังก์ชันอัพเดทสถานะเครือข่าย
function updateNetworkStatus(isOnline) {
    const statusElement = document.getElementById('onlineStatus');
    if (statusElement) {
        if (isOnline) {
            statusElement.className = 'online-status online';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> ออนไลน์';
            console.log('🟢 Network status: Online');
        } else {
            statusElement.className = 'online-status offline';
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> ออฟไลน์';
            console.log('🔴 Network status: Offline');
        }
    }
}

// ฟังก์ชันเริ่มตรวจสอบสถานะเครือข่าย
function initNetworkMonitoring() {
    console.log('📡 Initializing network monitoring...');
    
    // ตรวจสอบทันที
    const isOnline = checkNetworkStatus();
    updateNetworkStatus(isOnline);
    
    // ฟังการเปลี่ยนแปลง
    window.addEventListener('online', () => {
        console.log('Network event: Online');
        updateNetworkStatus(true);
        showNetworkNotification('เชื่อมต่อออนไลน์แล้ว', 'online');
    });
    
    window.addEventListener('offline', () => {
        console.log('Network event: Offline');
        updateNetworkStatus(false);
        showNetworkNotification('สูญเสียการเชื่อมต่อ', 'offline');
    });
    
    // สำหรับ Electron app
    if (window.electronAPI && window.electronAPI.onOnlineStatusChange) {
        window.electronAPI.onOnlineStatusChange((isOnline) => {
            console.log('Electron network status changed:', isOnline);
            updateNetworkStatus(isOnline);
            
            if (isOnline) {
                showNetworkNotification('เชื่อมต่อออนไลน์แล้ว', 'online');
            } else {
                showNetworkNotification('สูญเสียการเชื่อมต่อ', 'offline');
            }
        });
    }
}

// ฟังก์ชันแสดงการแจ้งเตือนเครือข่าย
function showNetworkNotification(message, type) {
    // ตรวจสอบว่ามี notification container หรือยัง
    let notificationContainer = document.getElementById('networkNotifications');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'networkNotifications';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 300px;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    // สร้าง notification
    const notification = document.createElement('div');
    notification.className = `network-notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${type === 'online' ? 'fa-wifi' : 'fa-wifi-slash'}" 
               style="font-size: 18px;"></i>
            <div>
                <strong>สถานะเครือข่าย</strong>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-left: auto; background: none; border: none; 
                           cursor: pointer; font-size: 18px; color: #666;">×</button>
        </div>
    `;
    
    // สไตล์ notification
    notification.style.cssText = `
        background: ${type === 'online' ? '#d1fae5' : '#fee2e2'};
        color: ${type === 'online' ? '#065f46' : '#991b1b'};
        border: 1px solid ${type === 'online' ? '#a7f3d0' : '#fecaca'};
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
    `;
    
    // เพิ่ม animation
    if (!document.getElementById('networkAnimations')) {
        const style = document.createElement('style');
        style.id = 'networkAnimations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // เพิ่ม notification
    notificationContainer.appendChild(notification);
    
    // ลบ notification อัตโนมัติหลังจาก 5 วินาที
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// ==============================================
// ฟังก์ชันตรวจสอบและป้องกัน redirect loop
// ==============================================

// 🔧 FIX: ฟังก์ชันตรวจสอบและป้องกัน redirect loop
function checkAndPreventRedirectLoop() {
    console.log('🔄 Checking for redirect loop...');
    
    // ตรวจสอบ URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isRedirected = urlParams.has('redirected');
    
    if (isRedirected) {
        console.log('⚠️ Redirect loop detected!');
        
        // ลบ parameter
        urlParams.delete('redirected');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
        
        // แสดงข้อความแจ้งเตือน
        showError('ตรวจพบปัญหาการล็อกอิน กรุณาลองใหม่อีกครั้ง');
        return true;
    }
    
    return false;
}

// ==============================================
// Event Listeners และ Initialization
// ==============================================

// จัดการฟอร์ม Login
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded - auth.js');
    
    // ตรวจสอบ redirect loop
    if (checkAndPreventRedirectLoop()) {
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    
    // 🔧 FIX: ไม่ต้องเรียก clearAuthData() ที่นี่ตอนโหลดหน้า
    // เพราะจะล้างข้อมูลที่เพิ่งบันทึกจากล็อกอินใหม่
    
    // ✅ ล้างค่าในฟอร์มเท่านั้น
    if (loginForm) {
        loginForm.reset();
        
        // ✅ ฟอร์ซเคลียร์ค่าใน input fields
        setTimeout(() => {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
        }, 100);
    }
    
    if (loginForm) {
        // ✅ ลบ event listener เดิมก่อนเพิ่มใหม่
        const newLoginForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newLoginForm, loginForm);
        
        newLoginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // 🔧 FIX: สำหรับหน้า login ให้ตรวจสอบว่าล็อกอินอยู่แล้วหรือไม่
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '' ||
        window.location.pathname.endsWith('/')) {
        
        console.log('🔍 Login page - checking if already logged in...');
        
        // รอสักครู่ให้โค้ดอื่นทำงานก่อน
        setTimeout(() => {
            if (isLoggedIn() && validateToken()) {
                console.log('✅ Already logged in, redirecting to stock...');
                
                // ตรวจสอบว่าเพิ่งล็อกอินมาใหม่หรือไม่
                const lastLogin = localStorage.getItem('lastLogin');
                if (lastLogin) {
                    const loginTime = new Date(lastLogin);
                    const now = new Date();
                    const secondsDiff = (now - loginTime) / 1000;
                    
                    // ถ้าล็อกอินมาไม่เกิน 30 วินาที ให้ redirect
                    if (secondsDiff < 30) {
                        console.log(`Recent login (${Math.round(secondsDiff)}s ago), redirecting...`);
                        setTimeout(() => {
                            window.location.href = 'stock.html';
                        }, 500);
                    } else {
                        console.log(`Old login (${Math.round(secondsDiff)}s ago), staying on login page`);
                    }
                }
            } else {
                console.log('Not logged in, staying on login page');
            }
        }, 500);
    }
});

// ==============================================
// Auto-initialize เมื่อโหลดหน้า
// ==============================================

// เรียกใช้เมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded...');
    
    // สำหรับหน้า Stock ให้ตั้งค่าเครือข่าย
    if (window.location.pathname.includes('stock.html')) {
        // เรียก initNetworkMonitoring ด้วย delay นิดหน่อย
        setTimeout(() => {
            if (typeof initNetworkMonitoring === 'function') {
                initNetworkMonitoring();
            }
        }, 500);
    }
});

// ==============================================
// ฟังก์ชัน global สำหรับเรียกใช้จาก console
// ==============================================

window.authDebug = function() {
    console.log('=== AUTH DEBUG ===');
    console.log('isLoggedIn:', isLoggedIn());
    console.log('User:', localStorage.getItem('user'));
    console.log('Token:', localStorage.getItem('token'));
    console.log('Last Login:', localStorage.getItem('lastLogin'));
    console.log('Current Page:', window.location.pathname);
    console.log('URL Params:', window.location.search);
    console.log('=================');
};

window.authLogout = logout;
window.authClear = clearAuthData;
window.checkNetworkStatus = checkNetworkStatus;
window.initNetworkMonitoring = initNetworkMonitoring;
window.showNetworkNotification = showNetworkNotification;
window.testRedirect = function() {
    console.log('Testing redirect to stock.html...');
    window.location.href = 'stock.html';
};