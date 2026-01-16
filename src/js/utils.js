// ฟังก์ชัน logout ที่ถูกต้อง
async function logout() {
    try {
        // ถ้ามี API ให้เรียก logout
        if (window.electronAPI && window.electronAPI.logout) {
            await window.electronAPI.logout();
        }
        
        // ✅ เรียก clearAuthData จาก auth.js
        if (typeof clearAuthData === 'function') {
            clearAuthData();
        } else {
            // ถ้าไม่ได้ import ให้ล้าง manual
            localStorage.clear();
            sessionStorage.clear();
        }
        
        // ✅ ใช้ replaceState เพื่อป้องกันการย้อนกลับ
        window.history.replaceState(null, '', 'index.html');
        
        // ✅ redirect ไปหน้า login พร้อมกับ timestamp เพื่อป้องกัน cache
        const timestamp = new Date().getTime();
        window.location.href = `index.html?t=${timestamp}`;
        
        // ✅ force reload ถ้ายังไม่เปลี่ยนหน้า
        setTimeout(() => {
            if (window.location.pathname.includes('index.html')) {
                window.location.reload(true);
            }
        }, 100);
        
    } catch (error) {
        console.error('Logout error:', error);
        // ถ้ามี error ก็ยังต้องเคลียร์ข้อมูล
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}