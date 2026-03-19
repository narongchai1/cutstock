// scripts/reset-database.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const sqlite3 = require('sqlite3');

// จำลอง app.getPath สำหรับ script
if (!app) {
    // ถ้าเรียกจาก node โดยตรง
    const userDataPath = path.join(process.env.APPDATA || 
        (process.platform === 'darwin' ? 
            path.join(process.env.HOME, 'Library/Application Support') : 
            path.join(process.env.HOME, '.config')), 
        'cutstock');
    
    global.app = { getPath: () => userDataPath };
}

const userDataPath = app ? app.getPath('userData') : 
    path.join(process.env.APPDATA || 
        (process.platform === 'darwin' ? 
            path.join(process.env.HOME, 'Library/Application Support') : 
            path.join(process.env.HOME, '.config')), 
        'cutstock');

const dbPath = path.join(userDataPath, 'data', 'cutstock.db');

console.log('🗑️  Removing database at:', dbPath);

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Database removed');
} else {
    console.log('ℹ️  Database not found');
}

console.log('🔄 Restart the application to create a new database');