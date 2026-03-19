// src/js/settings.js - Settings Manager สำหรับทุกหน้า (ฉบับสมบูรณ์)

// ==================== GLOBAL VARIABLES ====================
let bankAccounts = [];
let selectedBankId = null;
let currentUser = null;
let editingBankId = null; // สำหรับแก้ไขบัญชี

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบว่าไม่ใช่หน้า login
    if (window.location.pathname.includes('index.html')) {
        return;
    }
    
    // โหลดข้อมูลผู้ใช้
    loadCurrentUser();
    
    // สร้าง modals ถ้ายังไม่มี
    if (!document.getElementById('settingsModal')) {
        createSettingsModals();
    }
    
    // โหลดบัญชีธนาคาร
    loadBankAccounts();
    
    // เพิ่ม event listeners
    setupEventListeners();
});

function loadCurrentUser() {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            currentUser = JSON.parse(user);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

function setupEventListeners() {
    // ปิด modal เมื่อคลิก outside
    window.addEventListener('click', function(event) {
        const settingsModal = document.getElementById('settingsModal');
        const qrSettingsModal = document.getElementById('qrSettingsModal');
        
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (event.target === qrSettingsModal) {
            qrSettingsModal.style.display = 'none';
        }
    });
    
    // ปิด modal ด้วยปุ่ม Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeSettingsModal();
            closeQRPaymentSettings();
        }
    });
}

// ==================== CREATE MODALS ====================
function createSettingsModals() {
    createSettingsModal();
    createQRPaymentModal();
}

function createSettingsModal() {
    const settingsModal = document.createElement('div');
    settingsModal.id = 'settingsModal';
    settingsModal.className = 'modal';
    settingsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> ตั้งค่าระบบ</h2>
                <button class="close-modal" onclick="closeSettingsModal()">&times;</button>
            </div>
            
            <div class="settings-menu">
                <!-- เมนูจัดการ QR Payment -->
                <div class="settings-menu-item" onclick="openQRPaymentSettings()">
                    <i class="fas fa-qrcode"></i>
                    <div class="item-info">
                        <div class="item-title">จัดการบัญชีพร้อมเพย์</div>
                        <div class="item-desc">เพิ่ม/แก้ไข/ลบ บัญชีธนาคารสำหรับรับชำระผ่าน QR Code</div>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                
                <!-- เมนูข้อมูลผู้ใช้ -->
                <div class="settings-menu-item" onclick="showUserInfo()">
                    <i class="fas fa-user-circle"></i>
                    <div class="item-info">
                        <div class="item-title">ข้อมูลผู้ใช้</div>
                        <div class="item-desc" id="userInfoDesc">กำลังโหลด...</div>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                
                <!-- เมนูออกจากระบบ -->
                <div class="settings-menu-item logout-item" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <div class="item-info">
                        <div class="item-title">ออกจากระบบ</div>
                        <div class="item-desc">ออกจากระบบและกลับไปหน้า Login</div>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            
            <div class="modal-footer" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #95a5a6; font-size: 12px;">
                <span id="appVersion">CutStock v2.0.0</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(settingsModal);
    
    // อัพเดทข้อมูลผู้ใช้ใน modal
    updateUserInfoInModal();
}

function createQRPaymentModal() {
    const qrSettingsModal = document.createElement('div');
    qrSettingsModal.id = 'qrSettingsModal';
    qrSettingsModal.className = 'modal';
    qrSettingsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-qrcode"></i> จัดการบัญชีพร้อมเพย์</h2>
                <button class="close-modal" onclick="closeQRPaymentSettings()">&times;</button>
            </div>
            
            <div id="bankAccountsList" class="bank-accounts-list">
                <!-- รายการบัญชีธนาคารจะแสดงที่นี่ -->
            </div>
            
            <div class="add-bank-btn" onclick="showAddBankForm()">
                <i class="fas fa-plus-circle"></i> เพิ่มบัญชีธนาคาร
            </div>
            
            <div id="addBankForm" class="bank-form" style="display: none;">
                <h3 style="margin-bottom: 15px; color: #2c3e50;" id="bankFormTitle">เพิ่มบัญชีธนาคาร</h3>
                
                <div class="form-group">
                    <label>เลือกธนาคาร</label>
                    <select id="bankSelect" class="form-control">
                        <option value="SCB">ธนาคารไทยพาณิชย์</option>
                        <option value="KBANK">ธนาคารกสิกรไทย</option>
                        <option value="BBL">ธนาคารกรุงเทพ</option>
                        <option value="KTB">ธนาคารกรุงไทย</option>
                        <option value="TTB">ธนาคารทหารไทยธนชาต</option>
                        <option value="BAY">ธนาคารกรุงศรีอยุธยา</option>
                        <option value="GSB">ธนาคารออมสิน</option>
                        <option value="BAAC">ธ.ก.ส.</option>
                        <option value="CIMB">ธนาคาร CIMB ไทย</option>
                        <option value="UOB">ธนาคาร UOB</option>
                        <option value="TISCO">ธนาคารทิสโก้</option>
                        <option value="KKP">ธนาคารเกียรตินาคินภัทร</option>
                        <option value="LHB">ธนาคารแลนด์ แอนด์ เฮ้าส์</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>เลขที่บัญชี / เบอร์พร้อมเพย์</label>
                    <input type="text" id="accountNumber" class="form-control" placeholder="0812345678" maxlength="13">
                    <small class="form-hint">เบอร์โทรศัพท์ 9-10 หลัก หรือเลขบัญชี 10-12 หลัก</small>
                </div>
                
                <div class="form-group">
                    <label>ชื่อบัญชี</label>
                    <input type="text" id="accountName" class="form-control" placeholder="นาย สมชาย ใจดี">
                </div>
                
                <div class="form-group">
                    <label>ประเภทพร้อมเพย์</label>
                    <select id="promptpayType" class="form-control">
                        <option value="mobile">เบอร์มือถือ</option>
                        <option value="national_id">เลขบัตรประชาชน</option>
                        <option value="account">เลขที่บัญชี</option>
                        <option value="e-wallet">E-Wallet / พร้อมเพย์อื่นๆ</option>
                    </select>
                    <small class="form-hint">เลือกประเภทให้ตรงกับเลขที่กรอก</small>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="cancelAddBank()">ยกเลิก</button>
                    <button class="btn btn-success" onclick="saveBankAccount()" id="saveBankBtn">บันทึก</button>
                </div>
            </div>
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-primary" onclick="closeQRPaymentSettings()">ปิด</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(qrSettingsModal);
}

// ==================== SETTINGS MODAL FUNCTIONS ====================
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        updateUserInfoInModal();
        modal.style.display = 'flex';
    } else {
        console.error('Settings modal not found');
        createSettingsModals();
        setTimeout(() => {
            document.getElementById('settingsModal').style.display = 'flex';
        }, 100);
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateUserInfoInModal() {
    const userInfoDesc = document.getElementById('userInfoDesc');
    if (userInfoDesc && currentUser) {
        userInfoDesc.textContent = `${currentUser.name || currentUser.username} (${currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'})`;
    } else if (userInfoDesc) {
        userInfoDesc.textContent = 'ไม่พบข้อมูลผู้ใช้';
    }
}

function showUserInfo() {
    closeSettingsModal();
    
    if (!currentUser) {
        showAlert('ไม่พบข้อมูลผู้ใช้', 'warning');
        return;
    }
    
    const userInfo = `
        👤 ข้อมูลผู้ใช้
        ─────────────────
        ชื่อ: ${currentUser.name || '-'}
        ชื่อผู้ใช้: ${currentUser.username || '-'}
        สิทธิ์: ${currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
        อีเมล: ${currentUser.email || '-'}
        เบอร์โทร: ${currentUser.phone || '-'}
    `;
    
    alert(userInfo);
}

// ==================== QR PAYMENT FUNCTIONS ====================
function openQRPaymentSettings() {
    closeSettingsModal();
    const modal = document.getElementById('qrSettingsModal');
    if (modal) {
        modal.style.display = 'flex';
        loadBankAccounts();
        resetBankForm();
    } else {
        console.error('QR Settings modal not found');
    }
}

function closeQRPaymentSettings() {
    const modal = document.getElementById('qrSettingsModal');
    if (modal) {
        modal.style.display = 'none';
        resetBankForm();
    }
}

// ==================== BANK ACCOUNT FUNCTIONS ====================
function loadBankAccounts() {
    const saved = localStorage.getItem('bankAccounts');
    if (saved) {
        bankAccounts = JSON.parse(saved);
    } else {
        // ข้อมูลตัวอย่าง
        bankAccounts = [
            {
                id: '1',
                bank: 'SCB',
                bankName: 'ธนาคารไทยพาณิชย์',
                accountNumber: '0812345678',
                accountName: 'หจก. ร้านค้าสมใจ',
                promptpayType: 'mobile',
                isPromptPay: true,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                bank: 'KBANK',
                bankName: 'ธนาคารกสิกรไทย',
                accountNumber: '0898765432',
                accountName: 'นาง สมหญิง ใจงาม',
                promptpayType: 'mobile',
                isPromptPay: true,
                createdAt: new Date().toISOString()
            },
            {
                id: '3',
                bank: 'BBL',
                bankName: 'ธนาคารกรุงเทพ',
                accountNumber: '1234567890',
                accountName: 'บริษัท ค้าขาย จำกัด',
                promptpayType: 'account',
                isPromptPay: true,
                createdAt: new Date().toISOString()
            }
        ];
        saveBankAccounts();
    }
    updateBankAccountsDisplay();
    updateBankSelect();
}

function saveBankAccounts() {
    localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts));
}

function updateBankAccountsDisplay() {
    const container = document.getElementById('bankAccountsList');
    if (!container) return;
    
    if (bankAccounts.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-university fa-3x"></i><p>ยังไม่มีบัญชีธนาคาร</p><p style="font-size: 13px;">คลิก "เพิ่มบัญชีธนาคาร" เพื่อเริ่มต้น</p></div>';
        return;
    }
    
    let html = '';
    bankAccounts.forEach(account => {
        const isSelected = account.id === selectedBankId;
        const promptpayTypeText = getPromptPayTypeText(account.promptpayType);
        
        html += `
            <div class="bank-account-card ${isSelected ? 'selected' : ''}" data-id="${account.id}">
                <div class="bank-account-header" onclick="selectBankAccount('${account.id}')">
                    <div class="bank-icon">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="bank-name">${account.bankName}</div>
                </div>
                <div class="account-number" onclick="selectBankAccount('${account.id}')">${formatPhoneNumber(account.accountNumber)}</div>
                <div class="account-name" onclick="selectBankAccount('${account.id}')">${account.accountName}</div>
                <div class="promptpay-type-badge" onclick="selectBankAccount('${account.id}')">
                    <i class="fas fa-tag"></i> ${promptpayTypeText}
                </div>
                <div class="bank-account-actions">
                    <button class="btn btn-sm btn-warning" onclick="editBankAccount('${account.id}', event)">
                        <i class="fas fa-edit"></i> แก้ไข
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBankAccount('${account.id}', event)">
                        <i class="fas fa-trash"></i> ลบ
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function getPromptPayTypeText(type) {
    const types = {
        'mobile': 'เบอร์มือถือ',
        'national_id': 'บัตรประชาชน',
        'account': 'เลขที่บัญชี',
        'e-wallet': 'E-Wallet'
    };
    return types[type] || type;
}

function updateBankSelect() {
    const select = document.getElementById('qrBankSelect');
    if (!select) return;
    
    let options = '<option value="">-- เลือกบัญชี --</option>';
    bankAccounts.forEach(account => {
        const selected = account.id === selectedBankId ? 'selected' : '';
        const promptpayTypeText = getPromptPayTypeText(account.promptpayType);
        options += `<option value="${account.id}" ${selected}>${account.bankName} - ${formatPhoneNumber(account.accountNumber)} (${promptpayTypeText})</option>`;
    });
    select.innerHTML = options;
}

function selectBankAccount(id) {
    selectedBankId = id;
    updateBankAccountsDisplay();
    updateBankSelect();
    
    // ส่ง event ไปยังหน้าหลัก
    window.dispatchEvent(new CustomEvent('bankAccountSelected', { 
        detail: { 
            bankId: id, 
            account: bankAccounts.find(a => a.id === id) 
        }
    }));
    
    showAlert('เลือกบัญชีเรียบร้อย', 'success');
}

function changeSelectedBank() {
    const select = document.getElementById('qrBankSelect');
    selectedBankId = select.value;
    updateBankAccountsDisplay();
    
    window.dispatchEvent(new CustomEvent('bankAccountSelected', { 
        detail: { 
            bankId: selectedBankId, 
            account: bankAccounts.find(a => a.id === selectedBankId) 
        }
    }));
}

// ฟังก์ชันแก้ไขบัญชี
function editBankAccount(id, event) {
    if (event) {
        event.stopPropagation(); // ป้องกันการเลือกบัตร
    }
    
    const account = bankAccounts.find(a => a.id === id);
    if (!account) return;
    
    editingBankId = id;
    
    // แสดงฟอร์มและใส่ข้อมูล
    document.getElementById('bankFormTitle').textContent = 'แก้ไขบัญชีธนาคาร';
    document.getElementById('saveBankBtn').textContent = 'อัพเดท';
    document.getElementById('addBankForm').style.display = 'block';
    
    // ใส่ข้อมูล
    document.getElementById('bankSelect').value = account.bank;
    document.getElementById('accountNumber').value = account.accountNumber;
    document.getElementById('accountName').value = account.accountName;
    document.getElementById('promptpayType').value = account.promptpayType || 'mobile';
    
    // เลื่อนไปที่ฟอร์ม
    setTimeout(() => {
        document.getElementById('addBankForm').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// ฟังก์ชันลบบัญชี
function deleteBankAccount(id, event) {
    if (event) {
        event.stopPropagation(); // ป้องกันการเลือกบัตร
    }
    
    if (!confirm('คุณแน่ใจว่าต้องการลบบัญชีนี้?')) {
        return;
    }
    
    bankAccounts = bankAccounts.filter(a => a.id !== id);
    if (selectedBankId === id) {
        selectedBankId = bankAccounts.length > 0 ? bankAccounts[0].id : null;
    }
    
    saveBankAccounts();
    updateBankAccountsDisplay();
    updateBankSelect();
    
    window.dispatchEvent(new CustomEvent('bankAccountDeleted', { 
        detail: { bankId: id }
    }));
    
    showAlert('ลบบัญชีเรียบร้อย', 'success');
}

function showAddBankForm() {
    resetBankForm();
    document.getElementById('bankFormTitle').textContent = 'เพิ่มบัญชีธนาคาร';
    document.getElementById('saveBankBtn').textContent = 'บันทึก';
    document.getElementById('addBankForm').style.display = 'block';
    
    // เลื่อนไปที่ฟอร์ม
    setTimeout(() => {
        document.getElementById('addBankForm').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function resetBankForm() {
    editingBankId = null;
    document.getElementById('bankFormTitle').textContent = 'เพิ่มบัญชีธนาคาร';
    document.getElementById('saveBankBtn').textContent = 'บันทึก';
    document.getElementById('addBankForm').style.display = 'none';
    document.getElementById('bankSelect').value = 'SCB';
    document.getElementById('accountNumber').value = '';
    document.getElementById('accountName').value = '';
    document.getElementById('promptpayType').value = 'mobile';
}

function cancelAddBank() {
    resetBankForm();
}

function saveBankAccount() {
    const bank = document.getElementById('bankSelect').value;
    const accountNumber = document.getElementById('accountNumber').value.trim().replace(/\D/g, '');
    const accountName = document.getElementById('accountName').value.trim();
    const promptpayType = document.getElementById('promptpayType').value;
    
    // ตรวจสอบความถูกต้อง
    if (!bank) {
        showAlert('กรุณาเลือกธนาคาร', 'warning');
        return;
    }
    
    if (!accountNumber) {
        showAlert('กรุณากรอกเลขที่บัญชี / เบอร์พร้อมเพย์', 'warning');
        return;
    }
    
    // ตรวจสอบความยาวตามประเภท
    if (promptpayType === 'mobile' && (accountNumber.length < 9 || accountNumber.length > 10)) {
        showAlert('เบอร์มือถือต้องมีความยาว 9-10 หลัก', 'warning');
        return;
    }
    
    if (promptpayType === 'national_id' && accountNumber.length !== 13) {
        showAlert('เลขบัตรประชาชนต้องมีความยาว 13 หลัก', 'warning');
        return;
    }
    
    if (promptpayType === 'account' && (accountNumber.length < 10 || accountNumber.length > 12)) {
        showAlert('เลขที่บัญชีต้องมีความยาว 10-12 หลัก', 'warning');
        return;
    }
    
    if (!accountName) {
        showAlert('กรุณากรอกชื่อบัญชี', 'warning');
        return;
    }
    
    const bankNames = {
        'SCB': 'ธนาคารไทยพาณิชย์',
        'KBANK': 'ธนาคารกสิกรไทย',
        'BBL': 'ธนาคารกรุงเทพ',
        'KTB': 'ธนาคารกรุงไทย',
        'TTB': 'ธนาคารทหารไทยธนชาต',
        'BAY': 'ธนาคารกรุงศรีอยุธยา',
        'GSB': 'ธนาคารออมสิน',
        'BAAC': 'ธ.ก.ส.',
        'CIMB': 'ธนาคาร CIMB ไทย',
        'UOB': 'ธนาคาร UOB',
        'TISCO': 'ธนาคารทิสโก้',
        'KKP': 'ธนาคารเกียรตินาคินภัทร',
        'LHB': 'ธนาคารแลนด์ แอนด์ เฮ้าส์'
    };
    
    if (editingBankId) {
        // แก้ไขบัญชี
        const index = bankAccounts.findIndex(a => a.id === editingBankId);
        if (index !== -1) {
            bankAccounts[index] = {
                ...bankAccounts[index],
                bank: bank,
                bankName: bankNames[bank],
                accountNumber: accountNumber,
                accountName: accountName,
                promptpayType: promptpayType,
                isPromptPay: true,
                updatedAt: new Date().toISOString()
            };
            
            showAlert('แก้ไขบัญชีเรียบร้อย', 'success');
            
            window.dispatchEvent(new CustomEvent('bankAccountUpdated', { 
                detail: { account: bankAccounts[index] }
            }));
        }
    } else {
        // เพิ่มบัญชีใหม่
        const newAccount = {
            id: Date.now().toString(),
            bank: bank,
            bankName: bankNames[bank],
            accountNumber: accountNumber,
            accountName: accountName,
            promptpayType: promptpayType,
            isPromptPay: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        bankAccounts.push(newAccount);
        
        // เลือกบัญชีที่เพิ่มใหม่
        selectedBankId = newAccount.id;
        
        showAlert('เพิ่มบัญชีธนาคารเรียบร้อย', 'success');
        
        window.dispatchEvent(new CustomEvent('bankAccountAdded', { 
            detail: { account: newAccount }
        }));
    }
    
    saveBankAccounts();
    updateBankAccountsDisplay();
    updateBankSelect();
    resetBankForm();
}

function formatPhoneNumber(number) {
    const cleaned = ('' + number).replace(/\D/g, '');
    
    // เบอร์มือถือ 9-10 หลัก
    if (cleaned.length === 9) {
        return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    // เลขบัตรประชาชน 13 หลัก
    else if (cleaned.length === 13) {
        return cleaned.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
    }
    // เลขบัญชี 10-12 หลัก
    else if (cleaned.length >= 10 && cleaned.length <= 12) {
        return cleaned.replace(/(\d{4})(?=\d)/g, '$1-');
    }
    
    return number;
}

// ==================== PROMPTPAY QR CODE GENERATOR ====================

/**
 * สร้าง QR Code ตามมาตรฐาน PromptPay (Thai QR Standard)
 * รองรับการชำระเงินผ่านธนาคารทุกแห่งในประเทศไทย
 * 
 * @param {string} target - เบอร์โทร/เลขบัตร/เลขบัญชี (ไม่ต้องมีเครื่องหมายขีด)
 * @param {number} amount - จำนวนเงิน (ถ้าไม่ระบุหรือ 0 จะเป็น QR สำหรับถามยอด)
 * @param {string} type - ประเภท: 'mobile', 'national_id', 'account', 'e-wallet'
 * @returns {string} QR Code payload ที่พร้อมนำไปสร้างเป็น QR Code
 */
function generatePromptPayQR(target, amount = 0, type = 'mobile') {
    // ลบเครื่องหมายขีดและช่องว่าง
    const cleanTarget = target.replace(/[-\s]/g, '');
    
    // แปลงเป็นรูปแบบที่ PromptPay ต้องการ
    let formattedTarget = '';
    
    switch(type) {
        case 'mobile':
            // เบอร์มือถือ: 00 ตามด้วยรหัสประเทศ 66 และเบอร์ (ตัด 0 หน้า)
            const mobileWithoutZero = cleanTarget.startsWith('0') ? cleanTarget.substring(1) : cleanTarget;
            formattedTarget = `0066${mobileWithoutZero}`;
            break;
            
        case 'national_id':
            // เลขบัตรประชาชน: 02 ตามด้วยเลข 13 หลัก
            formattedTarget = `02${cleanTarget.padStart(13, '0')}`;
            break;
            
        case 'account':
            // เลขที่บัญชี: 03 ตามด้วยเลขบัญชี
            formattedTarget = `03${cleanTarget}`;
            break;
            
        case 'e-wallet':
            // E-Wallet: 04 ตามด้วย ID
            formattedTarget = `04${cleanTarget}`;
            break;
            
        default:
            formattedTarget = `0066${cleanTarget}`;
    }
    
    // สร้าง QR Payload ตามมาตรฐาน EMVCo
    // 00 - Payload Format Indicator
    let payload = '000201';
    
    // 01 - Point of Initiation Method (11 = Dynamic QR, 12 = Static QR)
    payload += amount > 0 ? '010211' : '010212';
    
    // 29 - Merchant Account Information (สำหรับ PromptPay)
    // 00 - AID (Application ID) for PromptPay
    const aid = '0016A000000677010111';
    
    // ความยาวของ Merchant ID
    const merchantIdLength = formattedTarget.length.toString().padStart(2, '0');
    
    // 01 - Merchant ID (เบอร์โทร/เลขบัตร/เลขบัญชี)
    const merchantId = `01${merchantIdLength}${formattedTarget}`;
    
    // รวม Merchant Account Information
    const merchantAccountInfo = aid + merchantId;
    const merchantAccountInfoLength = merchantAccountInfo.length.toString().padStart(2, '0');
    payload += `29${merchantAccountInfoLength}${merchantAccountInfo}`;
    
    // 58 - Country Code (TH)
    payload += '5802TH';
    
    // 53 - Transaction Currency (764 = THB)
    payload += '5303764';
    
    // 54 - Transaction Amount (ถ้ามี)
    if (amount && amount > 0) {
        const amountStr = amount.toFixed(2);
        const amountFormatted = amountStr.replace('.', '');
        const amountLength = amountFormatted.length.toString().padStart(2, '0');
        payload += `54${amountLength}${amountFormatted}`;
    }
    
    // 63 - CRC (Checksum) - จะคำนวณทีหลัง
    payload += '6304';
    
    // คำนวณ CRC16 (Cyclic Redundancy Check) ตามมาตรฐาน ISO/IEC 13239
    const crc = calculateCRC16(payload);
    
    // ต่อ CRC เข้ากับ payload
    const finalPayload = payload + crc.toString(16).toUpperCase().padStart(4, '0');
    
    return finalPayload;
}

/**
 * คำนวณ CRC16 สำหรับ PromptPay QR Code
 * ตามมาตรฐาน ISO/IEC 13239 (CRC-16/IBM-SDLC)
 * 
 * @param {string} data - ข้อมูลที่ต้องการคำนวณ (ไม่รวม CRC)
 * @returns {number} ค่า CRC16
 */
function calculateCRC16(data) {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    
    return crc;
}

/**
 * ทดสอบความถูกต้องของ QR Code
 * @param {string} payload - QR Code payload ที่ต้องการทดสอบ
 * @returns {boolean} true ถ้าถูกต้อง
 */
function validatePromptPayQR(payload) {
    if (!payload || payload.length < 4) return false;
    
    // ดึง CRC จาก payload
    const providedCRC = payload.slice(-4);
    const dataWithoutCRC = payload.slice(0, -4);
    
    // คำนวณ CRC ใหม่
    const calculatedCRC = calculateCRC16(dataWithoutCRC).toString(16).toUpperCase().padStart(4, '0');
    
    // เปรียบเทียบ
    return providedCRC === calculatedCRC;
}

/**
 * แยกข้อมูลจาก QR Code
 * @param {string} payload - QR Code payload
 * @returns {Object|null} ข้อมูลที่แยกได้
 */
function parsePromptPayQR(payload) {
    try {
        let index = 0;
        const result = {};
        
        while (index < payload.length - 4) { // ไม่รวม CRC
            const id = payload.substr(index, 2);
            const length = parseInt(payload.substr(index + 2, 2), 10);
            const value = payload.substr(index + 4, length);
            
            result[id] = value;
            
            index += 4 + length;
        }
        
        // ดึง CRC
        result['63'] = payload.slice(-4);
        
        return result;
    } catch (error) {
        console.error('Error parsing QR:', error);
        return null;
    }
}

/**
 * สร้าง QR Code สำหรับแสดงใน Canvas
 * @param {number} amount - จำนวนเงิน
 * @param {HTMLElement} canvas - Canvas element
 * @param {HTMLElement} bankInfo - Element สำหรับแสดงข้อมูลธนาคาร
 * @returns {Promise} Promise ที่สำเร็จเมื่อสร้าง QR เสร็จ
 */
async function generateQRCodeForPayment(amount, canvas, bankInfo) {
    if (!canvas) return false;
    
    // หาบัญชีที่เลือก
    const accounts = getBankAccounts();
    const selectedAccount = getSelectedBankAccount() || accounts[0];
    
    if (!selectedAccount) {
        if (bankInfo) {
            bankInfo.innerHTML = '<div class="text-danger">⚠️ กรุณาเพิ่มบัญชีธนาคารในตั้งค่า</div>';
        }
        return false;
    }
    
    // เลือกบัญชีแรกถ้ายังไม่มีการเลือก
    if (!selectedBankId && accounts.length > 0) {
        selectedBankId = accounts[0].id;
    }
    
    // อัพเดทข้อมูลธนาคาร
    const promptpayTypeText = getPromptPayTypeText(selectedAccount.promptpayType || 'mobile');
    const formattedNumber = formatPhoneNumber(selectedAccount.accountNumber);
    
    if (bankInfo) {
        bankInfo.innerHTML = `
            <div><i class="fas fa-university"></i> <strong>${selectedAccount.bankName}</strong></div>
            <div><i class="fas fa-mobile-alt"></i> พร้อมเพย์: <strong>${formattedNumber}</strong></div>
            <div><i class="fas fa-tag"></i> ประเภท: ${promptpayTypeText}</div>
            <div><i class="fas fa-user"></i> ${selectedAccount.accountName}</div>
            ${amount > 0 ? `<div><i class="fas fa-coins"></i> จำนวนเงิน: <strong>${formatCurrency(amount)}</strong></div>` : ''}
        `;
    }
    
    // สร้าง QR Code
    const qrData = generatePromptPayQR(
        selectedAccount.accountNumber,
        amount,
        selectedAccount.promptpayType || 'mobile'
    );
    
    // ตรวจสอบความถูกต้อง
    const isValid = validatePromptPayQR(qrData);
    if (!isValid) {
        console.warn('QR Code validation failed');
    }
    
    // ล้าง canvas เดิม
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // แสดง QR Code
    return new Promise((resolve, reject) => {
        if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
            QRCode.toCanvas(canvas, qrData, {
                width: 250,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'M'
            }, function(error) {
                if (error) {
                    console.error('Error generating QR code:', error);
                    ctx.font = '14px Kanit, sans-serif';
                    ctx.fillStyle = '#e74c3c';
                    ctx.textAlign = 'center';
                    ctx.fillText('ไม่สามารถสร้าง QR Code ได้', 125, 125);
                    reject(error);
                } else {
                    console.log('✅ PromptPay QR Code generated successfully');
                    resolve(qrData);
                }
            });
        } else {
            console.error('QRCode library not loaded');
            if (bankInfo) {
                bankInfo.innerHTML += '<div class="text-danger">⚠️ ไม่พบไลบรารีสร้าง QR Code</div>';
            }
            reject(new Error('QRCode library not loaded'));
        }
    });
}

function formatCurrency(amount) {
    return '฿' + (amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ==================== LOGOUT ====================
function logout() {
    if (confirm('คุณแน่ใจว่าต้องการออกจากระบบ?')) {
        // ลบข้อมูลผู้ใช้
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // ส่ง event ก่อนออก
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        
        // ไปที่หน้า login
        window.location.href = 'index.html';
    }
}

// ==================== GET BANK ACCOUNTS (สำหรับหน้าอื่นเรียกใช้) ====================
function getBankAccounts() {
    return [...bankAccounts];
}

function getSelectedBankId() {
    return selectedBankId;
}

function getSelectedBankAccount() {
    return bankAccounts.find(a => a.id === selectedBankId) || null;
}

// ==================== ALERT ====================
function showAlert(message, type = 'info') {
    // ใช้ฟังก์ชัน showAlert ของหน้าปัจจุบัน ถ้ามี
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
        return;
    }
    
    // ถ้าไม่มี ให้สร้าง alert ใหม่
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '10001';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '400px';
    alertDiv.style.animation = 'slideIn 0.3s ease';
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span style="flex: 1; margin-left: 10px;">${message}</span>
        <button class="btn-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ==================== ทำให้ฟังก์ชันเป็น global ====================
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openQRPaymentSettings = openQRPaymentSettings;
window.closeQRPaymentSettings = closeQRPaymentSettings;
window.selectBankAccount = selectBankAccount;
window.changeSelectedBank = changeSelectedBank;
window.editBankAccount = editBankAccount;
window.deleteBankAccount = deleteBankAccount;
window.showAddBankForm = showAddBankForm;
window.cancelAddBank = cancelAddBank;
window.saveBankAccount = saveBankAccount;
window.logout = logout;
window.getBankAccounts = getBankAccounts;
window.getSelectedBankId = getSelectedBankId;
window.getSelectedBankAccount = getSelectedBankAccount;
window.showUserInfo = showUserInfo;

// PromptPay QR Code functions
window.generatePromptPayQR = generatePromptPayQR;
window.calculateCRC16 = calculateCRC16;
window.validatePromptPayQR = validatePromptPayQR;
window.parsePromptPayQR = parsePromptPayQR;
window.generateQRCodeForPayment = generateQRCodeForPayment;
window.formatPhoneNumber = formatPhoneNumber;