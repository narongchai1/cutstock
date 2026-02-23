/**
 * Utils - ฟังก์ชันช่วยเหลือทั่วไป
 */

const Utils = {
  /**
   * จัดรูปแบบเงิน
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount || 0);
  },

  /**
   * จัดรูปแบบตัวเลข
   */
  formatNumber(num) {
    return Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /**
   * จัดรูปแบบวันที่
   */
  formatDate(date, format = 'short') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const options = {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      time: { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    };
    
    return d.toLocaleDateString('th-TH', options[format] || options.short);
  },

  /**
   * สร้าง ID
   */
  generateId(prefix = '') {
    return prefix + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * ดึง class สถานะสินค้า
   */
  getStatusClass(stock, minStock = 10) {
    if (stock === 0) return 'badge-danger';
    if (stock <= minStock) return 'badge-warning';
    return 'badge-success';
  },

  /**
   * ดึงข้อความสถานะสินค้า
   */
  getStatusText(stock, minStock = 10) {
    if (stock === 0) return 'หมด';
    if (stock <= minStock) return 'ใกล้หมด';
    return 'ปกติ';
  },

  /**
   * ดึงสถานะวันหมดอายุ
   */
  getExpiryStatus(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { class: 'badge-danger', text: 'หมดอายุ' };
    if (daysLeft < 30) return { class: 'badge-warning', text: 'ใกล้หมดอายุ' };
    return { class: 'badge-success', text: 'ปกติ' };
  },

  /**
   * รวมค่า
   */
  sum(array, key) {
    return array.reduce((total, item) => total + (item[key] || 0), 0);
  },

  /**
   * ดึงพารามิเตอร์จาก URL
   */
  getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }
};

window.Utils = Utils;