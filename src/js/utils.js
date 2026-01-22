// js/utils.js - เพิ่มฟังก์ชันสำหรับจัดการ UI

// Dark mode toggle
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
}

// Initialize dark mode from localStorage
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification alert alert-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="btn-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
});

// Tab functionality
function openTab(tabId, element) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show current tab content and activate tab
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}

// View toggle (table/card view)
function toggleView(viewType) {
    const tableView = document.querySelector('.table-container');
    const cardsView = document.querySelector('.cards-view');
    const tableBtn = document.querySelector('[onclick="toggleView(\'table\')"]');
    const cardsBtn = document.querySelector('[onclick="toggleView(\'cards\')"]');
    
    if (viewType === 'table') {
        tableView.style.display = 'block';
        if (cardsView) cardsView.style.display = 'none';
        tableBtn.classList.add('active');
        if (cardsBtn) cardsBtn.classList.remove('active');
        localStorage.setItem('preferredView', 'table');
    } else {
        if (cardsView) cardsView.style.display = 'grid';
        tableView.style.display = 'none';
        tableBtn.classList.remove('active');
        if (cardsBtn) cardsBtn.classList.add('active');
        localStorage.setItem('preferredView', 'cards');
    }
}

// Initialize preferred view
function initView() {
    const preferredView = localStorage.getItem('preferredView') || 'table';
    toggleView(preferredView);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2
    }).format(amount);
}

// Format number with commas
function formatNumber(num) {
    return new Intl.NumberFormat('th-TH').format(num);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    initView();
});