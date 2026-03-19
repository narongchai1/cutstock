// lots.js - ฉบับแก้ไข

// Global variables
let allProducts = [];
let currentProduct = null;
let productLots = [];
let suppliers = [];

// โหลดรายการสินค้า
async function loadProducts() {
    try {
        const productSelect = document.getElementById('productSelect');
        const lotProductSelect = document.getElementById('lotProductId');
        
        if (window.electronAPI) {
            allProducts = await window.electronAPI.getProducts() || [];
        } else {
            const storedProducts = localStorage.getItem('demo_products');
            allProducts = storedProducts ? JSON.parse(storedProducts) : [];
        }
        
        if (allProducts.length === 0) {
            allProducts = [
                { id: 'P001', name: 'ข้าวสารหอมมะลิ 5กก.', price: 250, stock: 50, unit: 'ถุง', category: 'อาหาร', status: 'active' },
                { id: 'P002', name: 'น้ำปลาตราปลาหมึก 750ml', price: 45, stock: 100, unit: 'ขวด', category: 'เครื่องปรุง', status: 'active' },
                { id: 'P003', name: 'น้ำมันพืช 1ลิตร', price: 65, stock: 75, unit: 'ขวด', category: 'เครื่องปรุง', status: 'active' },
                { id: 'P004', name: 'ไข่ไก่ เบอร์2 แผง 30ฟอง', price: 120, stock: 30, unit: 'แผง', category: 'อาหาร', status: 'active' },
                { id: 'P005', name: 'นมสด ตรามะลิ 1ลิตร', price: 55, stock: 40, unit: 'กล่อง', category: 'เครื่องดื่ม', status: 'active' }
            ];
        }
        
        let options = '<option value="">-- เลือกสินค้า --</option>';
        allProducts.forEach(product => {
            if (product.status === 'active') {
                options += `<option value="${product.id}">${product.id} - ${product.name} (คงเหลือ ${product.stock || 0} ${product.unit || 'ชิ้น'})</option>`;
            }
        });
        
        if (productSelect) productSelect.innerHTML = options;
        if (lotProductSelect) lotProductSelect.innerHTML = options;
        
        await loadSuppliers();
        await loadStats();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดสินค้า', 'danger');
    }
}

// โหลดซัพพลายเออร์
async function loadSuppliers() {
    try {
        if (window.electronAPI) {
            suppliers = await window.electronAPI.getAllSuppliers() || [];
        } else {
            const storedSuppliers = localStorage.getItem('demo_suppliers');
            if (storedSuppliers) {
                suppliers = JSON.parse(storedSuppliers);
            } else {
                suppliers = [
                    { code: 'SUP-001', name: 'บริษัท ไทย-เดนมาร์ค จำกัด', contact_person: 'สมชาย ใจดี' },
                    { code: 'SUP-002', name: 'บริษัท ซีฟู้ด จำกัด', contact_person: 'สมหญิง เก่งงาน' }
                ];
            }
        }
        
        const supplierSelect = document.getElementById('supplierCode');
        if (supplierSelect) {
            let options = '<option value="">-- เลือกซัพพลายเออร์ --</option>';
            suppliers.forEach(supplier => {
                options += `<option value="${supplier.code}">${supplier.code} - ${supplier.name}</option>`;
            });
            supplierSelect.innerHTML = options;
        }
        
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

// ฟังก์ชัน toggle วันหมดอายุ
function toggleExpiryDate(checkbox) {
    const lotSection = checkbox.closest('.lot-section');
    if (!lotSection) return;
    
    const expiryDateInput = lotSection.querySelector('.expiry-date');
    if (!expiryDateInput) return;
    
    if (checkbox.checked) {
        expiryDateInput.disabled = true;
        expiryDateInput.value = '';
        expiryDateInput.removeAttribute('required');
    } else {
        expiryDateInput.disabled = false;
        expiryDateInput.setAttribute('required', 'required');
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        expiryDateInput.value = nextYear.toISOString().split('T')[0];
    }
}

// โหลดล็อตของสินค้าที่เลือก
async function loadProductLots() {
    const productSelect = document.getElementById('productSelect');
    if (!productSelect) return;
    
    const productId = productSelect.value;
    
    if (!productId) {
        const selectedProductInfo = document.getElementById('selectedProductInfo');
        const lotsContainer = document.getElementById('lotsContainer');
        
        if (selectedProductInfo) selectedProductInfo.style.display = 'none';
        if (lotsContainer) {
            lotsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <p>กรุณาเลือกสินค้าเพื่อดูล็อต</p>
                </div>
            `;
        }
        return;
    }
    
    try {
        currentProduct = allProducts.find(p => p.id === productId);
        
        if (currentProduct) {
            const nameEl = document.getElementById('selectedProductName');
            const codeEl = document.getElementById('selectedProductCode');
            const barcodeEl = document.getElementById('selectedProductBarcode');
            const priceEl = document.getElementById('selectedProductPrice');
            const costEl = document.getElementById('selectedProductCost');
            const stockBadge = document.getElementById('selectedProductStock');
            const infoEl = document.getElementById('selectedProductInfo');
            
            if (nameEl) nameEl.textContent = currentProduct.name;
            if (codeEl) codeEl.textContent = currentProduct.id;
            if (barcodeEl) barcodeEl.textContent = currentProduct.barcode || '-';
            if (priceEl) priceEl.textContent = (currentProduct.price || 0).toFixed(2);
            if (costEl) costEl.textContent = (currentProduct.cost || 0).toFixed(2);
            
            const stock = currentProduct.stock || 0;
            if (stockBadge) {
                if (stock === 0) {
                    stockBadge.className = 'stock-badge';
                    stockBadge.textContent = 'สินค้าหมด';
                } else if (stock <= (currentProduct.min_stock || 10)) {
                    stockBadge.className = 'stock-badge low';
                    stockBadge.textContent = 'สินค้าใกล้หมด';
                } else {
                    stockBadge.className = 'stock-badge normal';
                    stockBadge.textContent = 'มีสินค้า';
                }
            }
            
            if (infoEl) infoEl.style.display = 'block';
        }
        
        if (window.electronAPI) {
            productLots = await window.electronAPI.getProductLots(productId) || [];
        } else {
            const storedLots = JSON.parse(localStorage.getItem('demo_lots') || '{}');
            productLots = storedLots[productId] || [];
        }
        
        productLots = productLots.map(lot => ({
            ...lot,
            has_no_expiry: lot.has_no_expiry === 1 || lot.has_no_expiry === true,
            lot_number: lot.lot_number || lot.lotNumber || '',
            product_number: lot.product_number || lot.productNumber || '',
            expiry_date: lot.expiry_date || lot.expiryDate || null
        }));
        
        displayLots();
        
    } catch (error) {
        console.error('Error loading product lots:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดล็อตสินค้า', 'danger');
    }
}

// แสดงล็อตสินค้า
function displayLots() {
    const container = document.getElementById('lotsContainer');
    const expiryFilter = document.getElementById('expiryFilter');
    
    if (!container) return;
    
    const filterValue = expiryFilter ? expiryFilter.value : 'all';
    
    if (!productLots || productLots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-layer-group"></i>
                <p>ไม่มีล็อตสินค้าสำหรับสินค้านี้</p>
                <button class="btn btn-primary" onclick="showAddLotModal('${currentProduct?.id || ''}')">
                    <i class="fas fa-plus"></i> เพิ่มล็อตแรก
                </button>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    let filteredLots = [...productLots];
    
    if (filterValue !== 'all') {
        filteredLots = filteredLots.filter(lot => {
            if (lot.has_no_expiry) return filterValue === 'all';
            if (!lot.expiry_date) return false;
            
            const expiryDate = new Date(lot.expiry_date);
            if (isNaN(expiryDate.getTime())) return false;
            
            const daysToExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            if (filterValue === 'normal') return daysToExpiry >= 30;
            if (filterValue === 'warning') return daysToExpiry >= 0 && daysToExpiry < 30;
            if (filterValue === 'danger') return daysToExpiry < 0;
            return true;
        });
    }
    
    let html = '<div class="lots-grid">';
    
    filteredLots.forEach((lot, index) => {
        let headerClass = '';
        let expiryClass = 'expiry-normal';
        let expiryText = 'ปกติ';
        let expiryDisplay = '';
        
        if (lot.has_no_expiry) {
            expiryDisplay = '<span class="expiry-badge expiry-normal"><i class="fas fa-infinity"></i> ไม่หมดอายุ</span>';
        } else {
            if (!lot.expiry_date) {
                expiryDisplay = '<span class="expiry-badge expiry-normal">ไม่ระบุ</span>';
            } else {
                const expiryDate = new Date(lot.expiry_date);
                if (!isNaN(expiryDate.getTime())) {
                    const daysToExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                    expiryDisplay = formatDate(lot.expiry_date);
                    
                    if (daysToExpiry < 0) {
                        headerClass = 'danger';
                        expiryClass = 'expiry-danger';
                        expiryText = 'หมดอายุ';
                    } else if (daysToExpiry < 30) {
                        headerClass = 'warning';
                        expiryClass = 'expiry-warning';
                        expiryText = 'ใกล้หมดอายุ';
                    }
                } else {
                    expiryDisplay = '<span class="expiry-badge expiry-normal">ไม่ถูกต้อง</span>';
                }
            }
        }
        
        const supplierCode = lot.supplier_code || lot.supplierCode;
        const supplier = suppliers.find(s => s.code === supplierCode);
        
        html += `
            <div class="lot-card">
                <div class="lot-header ${headerClass}">
                    <span class="lot-number"><i class="fas fa-cube"></i> ${lot.lot_number || `ล็อต #${index + 1}`}</span>
                    <div class="lot-actions">
                        <button class="btn btn-sm btn-warning" onclick="editLot('${index}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteLot('${index}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="lot-body">
                    <div class="lot-info">
                        <div class="info-item">
                            <div class="info-label">หมายเลขผลิตภัณฑ์</div>
                            <div class="info-value">${lot.product_number || '-'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">จำนวน</div>
                            <div class="info-value">${lot.quantity || 0} ${currentProduct?.unit || 'ชิ้น'}</div>
                        </div>
                    </div>
                    
                    <div class="lot-info">
                        <div class="info-item">
                            <div class="info-label">วันหมดอายุ</div>
                            <div class="info-value">
                                ${lot.has_no_expiry ? 
                                    '<span class="expiry-badge expiry-normal"><i class="fas fa-infinity"></i> ไม่หมดอายุ</span>' : 
                                    (lot.expiry_date ? `${expiryDisplay} <span class="expiry-badge ${expiryClass}">${expiryText}</span>` : '-')}
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">วันที่รับเข้า</div>
                            <div class="info-value">${formatDate(lot.received_date)}</div>
                        </div>
                    </div>
                    
                    <div class="lot-info">
                        <div class="info-item">
                            <div class="info-label">การรับประกัน</div>
                            <div class="info-value">${lot.warranty || '-'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">ราคาทุน</div>
                            <div class="info-value">${lot.cost ? formatCurrency(lot.cost) : '-'}</div>
                        </div>
                    </div>
                    
                    <div class="info-item" style="margin-top: 10px;">
                        <div class="info-label">ซัพพลายเออร์</div>
                        <div class="info-value">
                            ${supplier ? 
                                `<span class="supplier-link" onclick="showSupplierDetail('${supplier.code}')">${supplier.code} - ${supplier.name}</span>` : 
                                (supplierCode || '-')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// กรองล็อต
function filterLots() {
    if (currentProduct) {
        displayLots();
    }
}

// โหลดสถิติ
async function loadStats() {
    let totalLots = 0;
    let totalQuantity = 0;
    let expiringSoon = 0;
    let expired = 0;
    let noExpiry = 0;
    
    const storedLots = JSON.parse(localStorage.getItem('demo_lots') || '{}');
    const today = new Date();
    
    Object.values(storedLots).forEach(productLots => {
        productLots.forEach(lot => {
            totalLots++;
            totalQuantity += lot.quantity || 0;
            
            const hasNoExpiry = lot.has_no_expiry === 1 || lot.has_no_expiry === true;
            
            if (hasNoExpiry) {
                noExpiry++;
            } else {
                if (lot.expiry_date) {
                    const expiryDate = new Date(lot.expiry_date);
                    if (!isNaN(expiryDate.getTime())) {
                        const daysToExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
                        
                        if (daysToExpiry < 0) {
                            expired++;
                        } else if (daysToExpiry < 30) {
                            expiringSoon++;
                        }
                    }
                }
            }
        });
    });
    
    const totalLotsEl = document.getElementById('totalLots');
    const totalQuantityEl = document.getElementById('totalQuantity');
    const expiringSoonEl = document.getElementById('expiringSoon');
    const expiredEl = document.getElementById('expired');
    const noExpiryEl = document.getElementById('noExpiry');
    
    if (totalLotsEl) totalLotsEl.textContent = totalLots;
    if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
    if (expiringSoonEl) expiringSoonEl.textContent = expiringSoon;
    if (expiredEl) expiredEl.textContent = expired;
    if (noExpiryEl) noExpiryEl.textContent = noExpiry;
}

// แสดง modal เพิ่มล็อต
function showAddLotModal(productId = null) {
    const modalTitle = document.getElementById('modalTitle');
    const lotForm = document.getElementById('lotForm');
    const lotId = document.getElementById('lotId');
    const receivedDate = document.getElementById('receivedDate');
    const expiryDate = document.getElementById('expiryDate');
    const lotProductId = document.getElementById('lotProductId');
    const noExpiryCheckbox = document.querySelector('#lotModal .no-expiry-checkbox');
    
    if (modalTitle) modalTitle.textContent = 'เพิ่มล็อตสินค้า';
    if (lotForm) lotForm.reset();
    if (lotId) lotId.value = '';
    
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    if (receivedDate) receivedDate.value = today;
    if (expiryDate) {
        expiryDate.value = nextYear.toISOString().split('T')[0];
        expiryDate.disabled = false;
        expiryDate.setAttribute('required', 'required');
    }
    
    if (noExpiryCheckbox) {
        noExpiryCheckbox.checked = false;
    }
    
    if (productId && lotProductId) {
        lotProductId.value = productId;
    }
    
    const lotModal = document.getElementById('lotModal');
    if (lotModal) lotModal.style.display = 'flex';
}

// แก้ไขล็อต
function editLot(index) {
    const lot = productLots[index];
    if (!lot) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const lotId = document.getElementById('lotId');
    const lotProductId = document.getElementById('lotProductId');
    const lotNumber = document.getElementById('lotNumber');
    const productNumber = document.getElementById('productNumber');
    const expiryDate = document.getElementById('expiryDate');
    const receivedDate = document.getElementById('receivedDate');
    const lotQuantity = document.getElementById('lotQuantity');
    const lotUnit = document.getElementById('lotUnit');
    const warranty = document.getElementById('warranty');
    const lotCost = document.getElementById('lotCost');
    const supplierCode = document.getElementById('supplierCode');
    const noExpiryCheckbox = document.querySelector('#lotModal .no-expiry-checkbox');
    
    if (modalTitle) modalTitle.textContent = 'แก้ไขล็อตสินค้า';
    if (lotId) lotId.value = index;
    if (lotProductId) lotProductId.value = currentProduct?.id || '';
    if (lotNumber) lotNumber.value = lot.lot_number || '';
    if (productNumber) productNumber.value = lot.product_number || '';
    if (expiryDate) expiryDate.value = lot.expiry_date || '';
    if (receivedDate) receivedDate.value = lot.received_date || '';
    if (lotQuantity) lotQuantity.value = lot.quantity || 0;
    if (lotUnit) lotUnit.value = currentProduct?.unit || 'ชิ้น';
    if (warranty) warranty.value = lot.warranty || '';
    if (lotCost) lotCost.value = lot.cost || '';
    if (supplierCode) supplierCode.value = lot.supplier_code || '';
    
    if (noExpiryCheckbox && expiryDate) {
        const hasNoExpiry = lot.has_no_expiry || false;
        noExpiryCheckbox.checked = hasNoExpiry;
        
        if (hasNoExpiry) {
            expiryDate.disabled = true;
            expiryDate.value = '';
            expiryDate.removeAttribute('required');
        } else {
            expiryDate.disabled = false;
            expiryDate.setAttribute('required', 'required');
        }
    }
    
    loadSupplierInfo(lot.supplier_code);
    
    const lotModal = document.getElementById('lotModal');
    if (lotModal) lotModal.style.display = 'flex';
}

// ลบล็อต
async function deleteLot(index) {
    if (!confirm('คุณแน่ใจว่าต้องการลบล็อตสินค้านี้?')) return;
    
    try {
        const lot = productLots[index];
        
        if (window.electronAPI && lot.id) {
            await window.electronAPI.deleteProductLot(lot.id);
        }
        
        productLots.splice(index, 1);
        
        if (currentProduct) {
            const storedLots = JSON.parse(localStorage.getItem('demo_lots') || '{}');
            storedLots[currentProduct.id] = productLots;
            localStorage.setItem('demo_lots', JSON.stringify(storedLots));
        }
        
        await updateProductStock();
        
        showAlert('ลบล็อตสินค้าเรียบร้อย', 'success');
        displayLots();
        await loadStats();
        
    } catch (error) {
        console.error('Error deleting lot:', error);
        showAlert('เกิดข้อผิดพลาดในการลบล็อตสินค้า', 'danger');
    }
}

// บันทึกล็อต
async function saveLot() {
    const lotId = document.getElementById('lotId')?.value;
    const productId = document.getElementById('lotProductId')?.value;
    const lotNumber = document.getElementById('lotNumber')?.value;
    const productNumber = document.getElementById('productNumber')?.value;
    const expiryDate = document.getElementById('expiryDate')?.value;
    const receivedDate = document.getElementById('receivedDate')?.value;
    const lotQuantity = document.getElementById('lotQuantity')?.value;
    const warranty = document.getElementById('warranty')?.value;
    const lotCost = document.getElementById('lotCost')?.value;
    const supplierCode = document.getElementById('supplierCode')?.value;
    const noExpiryCheckbox = document.querySelector('#lotModal .no-expiry-checkbox');
    
    if (!productId) {
        showAlert('กรุณาเลือกสินค้า', 'warning');
        return;
    }
    
    const hasNoExpiry = noExpiryCheckbox ? noExpiryCheckbox.checked : false;
    
    const lotData = {
        product_id: productId,
        lot_number: lotNumber ? lotNumber.trim() : '',
        product_number: productNumber ? productNumber.trim() : '',
        expiry_date: hasNoExpiry ? null : (expiryDate || null),
        has_no_expiry: hasNoExpiry,
        received_date: receivedDate || new Date().toISOString().split('T')[0],
        quantity: parseInt(lotQuantity) || 0,
        warranty: warranty ? warranty.trim() : '',
        cost: parseFloat(lotCost) || null,
        supplier_code: supplierCode || null
    };
    
    if (!lotData.lot_number) {
        showAlert('กรุณากรอกล็อตหมายเลข', 'warning');
        return;
    }
    
    if (!hasNoExpiry && !lotData.expiry_date) {
        showAlert('กรุณาเลือกวันหมดอายุ หรือเลือก "ไม่มีวันหมดอายุ"', 'warning');
        return;
    }
    
    if (lotData.quantity <= 0) {
        showAlert('จำนวนต้องมากกว่า 0', 'warning');
        return;
    }
    
    try {
        if (lotId === '') {
            if (window.electronAPI) {
                const result = await window.electronAPI.addProductLot(lotData);
                if (result && result.id) {
                    lotData.id = result.id;
                }
            }
            
            productLots.push(lotData);
        } else {
            const index = parseInt(lotId);
            
            if (window.electronAPI && productLots[index]?.id) {
                await window.electronAPI.updateProductLot(productLots[index].id, lotData);
            }
            
            productLots[index] = { ...productLots[index], ...lotData };
        }
        
        if (currentProduct) {
            const storedLots = JSON.parse(localStorage.getItem('demo_lots') || '{}');
            storedLots[currentProduct.id] = productLots;
            localStorage.setItem('demo_lots', JSON.stringify(storedLots));
        }
        
        await updateProductStock();
        
        showAlert('บันทึกล็อตสินค้าเรียบร้อย', 'success');
        closeModal('lotModal');
        displayLots();
        await loadStats();
        
    } catch (error) {
        console.error('Error saving lot:', error);
        showAlert('เกิดข้อผิดพลาดในการบันทึก', 'danger');
    }
}

// อัพเดทสต็อกสินค้าจากล็อตทั้งหมด
async function updateProductStock() {
    if (!currentProduct) return;
    
    try {
        const totalStock = productLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
        
        const updatedProduct = {
            ...currentProduct,
            stock: totalStock
        };
        
        const index = allProducts.findIndex(p => p.id === currentProduct.id);
        if (index !== -1) {
            allProducts[index] = updatedProduct;
        }
        
        localStorage.setItem('demo_products', JSON.stringify(allProducts));
        
        if (window.electronAPI) {
            await window.electronAPI.saveProduct(updatedProduct);
        }
        
        currentProduct = updatedProduct;
        
        const stockBadge = document.getElementById('selectedProductStock');
        if (stockBadge) {
            stockBadge.textContent = 
                totalStock === 0 ? 'สินค้าหมด' : (totalStock <= (currentProduct.min_stock || 10) ? 'สินค้าใกล้หมด' : 'มีสินค้า');
        }
        
        window.dispatchEvent(new CustomEvent('stockUpdated', { 
            detail: { productId: currentProduct.id, newStock: totalStock }
        }));
        
    } catch (error) {
        console.error('Error updating product stock:', error);
    }
}

// โหลดข้อมูลซัพพลายเออร์
function loadSupplierInfo(supplierCode) {
    const supplier = suppliers.find(s => s.code === supplierCode);
    const supplierName = document.getElementById('supplierName');
    const supplierContact = document.getElementById('supplierContact');
    const supplierPhone = document.getElementById('supplierPhone');
    const supplierInfo = document.getElementById('supplierInfo');
    
    if (supplier && supplierName && supplierContact && supplierPhone && supplierInfo) {
        supplierName.textContent = supplier.name;
        supplierContact.textContent = supplier.contact_person || '-';
        supplierPhone.textContent = supplier.phone || '-';
        supplierInfo.style.display = 'block';
    } else {
        if (supplierInfo) supplierInfo.style.display = 'none';
    }
}

// แสดงรายละเอียดซัพพลายเออร์
function showSupplierDetail(supplierCode) {
    localStorage.setItem('selectedSupplier', supplierCode);
    window.open('suppliers.html', '_blank');
}

// ส่งออกรายงานล็อต
function exportLots() {
    if (!productLots || productLots.length === 0) {
        showAlert('ไม่มีข้อมูลล็อตที่จะส่งออก', 'warning');
        return;
    }
    
    const headers = ['ล็อตหมายเลข', 'หมายเลขผลิตภัณฑ์', 'วันหมดอายุ', 'ไม่มีวันหมดอายุ', 'วันที่รับเข้า', 'จำนวน', 'การรับประกัน', 'ราคาทุน', 'รหัสซัพพลายเออร์'];
    const rows = [headers.join(',')];
    
    productLots.forEach(lot => {
        const row = [
            `"${lot.lot_number || ''}"`,
            `"${lot.product_number || ''}"`,
            `"${lot.expiry_date || ''}"`,
            lot.has_no_expiry ? 'ใช่' : 'ไม่ใช่',
            `"${lot.received_date || ''}"`,
            lot.quantity || 0,
            `"${lot.warranty || ''}"`,
            lot.cost || 0,
            `"${lot.supplier_code || ''}"`
        ];
        rows.push(row.join(','));
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lots_${currentProduct?.id || 'all'}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showAlert('ส่งออกรายงานเรียบร้อย', 'success');
}

// ฟังก์ชันอำนวยความสะดวก
function formatNumber(num) {
    if (num === undefined || num === null) return '0.00';
    return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCurrency(amount) {
    return '฿' + formatNumber(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return '-';
    }
}

function showAlert(message, type = 'info') {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
        return;
    }
    alert(message);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Event listeners
window.addEventListener('stockUpdated', (event) => {
    if (event.detail.productId === currentProduct?.id) {
        currentProduct.stock = event.detail.newStock;
    }
});

window.addEventListener('supplierUpdated', () => {
    loadSuppliers();
});

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    const selectedSupplier = localStorage.getItem('selectedSupplier');
    if (selectedSupplier) {
        setTimeout(() => {
            const supplierSelect = document.getElementById('supplierCode');
            if (supplierSelect) {
                supplierSelect.value = selectedSupplier;
                loadSupplierInfo(selectedSupplier);
            }
            localStorage.removeItem('selectedSupplier');
        }, 500);
    }
});

// ทำให้ฟังก์ชันสามารถเรียกจาก HTML ได้
window.loadProducts = loadProducts;
window.loadProductLots = loadProductLots;
window.filterLots = filterLots;
window.showAddLotModal = showAddLotModal;
window.editLot = editLot;
window.deleteLot = deleteLot;
window.saveLot = saveLot;
window.exportLots = exportLots;
window.closeModal = closeModal;
window.toggleExpiryDate = toggleExpiryDate;
window.loadSupplierInfo = loadSupplierInfo;
window.showSupplierDetail = showSupplierDetail;