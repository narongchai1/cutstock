const path = require('path');
const sqlite3 = require('better-sqlite3');

// Test database connection
function testDatabase() {
  console.log('=== Testing SQLite Database ===\n');
  
  // ลองหลาย path
  const paths = [
    path.join(__dirname, 'data', 'stock.db'),
    path.join(process.cwd(), 'data', 'stock.db'),
    path.join(__dirname, 'src', 'data', 'stock.db')
  ];
  
  for (const dbPath of paths) {
    console.log(`Trying path: ${dbPath}`);
    
    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const fs = require('fs');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // เชื่อมต่อ database
      const db = sqlite3(dbPath);
      console.log(`✅ Connected to database at: ${dbPath}`);
      
      // สร้างตารางทดสอบ
      db.prepare(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // เพิ่มข้อมูลทดสอบ
      const insert = db.prepare('INSERT INTO test_table (name) VALUES (?)');
      insert.run('Test Record ' + Date.now());
      
      // อ่านข้อมูล
      const records = db.prepare('SELECT * FROM test_table').all();
      console.log(`✅ Test records: ${records.length} rows`);
      
      // ปิด connection
      db.close();
      
      return dbPath; // คืน path ที่ใช้งานได้
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  return null;
}

// Test ด้วย database module จริง
function testWithModule() {
  console.log('\n=== Testing with database module ===\n');
  
  try {
    const database = require('./src/js/database');
    
    // Test getCategories
    console.log('Testing getCategories...');
    database.getCategories().then(categories => {
      console.log(`✅ Categories count: ${categories.length}`);
      console.log('Categories:', categories);
    });
    
    // Test authenticate
    console.log('\nTesting authenticate...');
    database.authenticate('admin', 'admin123').then(result => {
      console.log(`✅ Login success: ${result.success}`);
      if (result.success) {
        console.log('User:', result.user);
      }
    });
    
  } catch (error) {
    console.log(`❌ Module test failed: ${error.message}`);
  }
}

// เรียกทดสอบ
if (require.main === module) {
  const successPath = testDatabase();
  if (successPath) {
    console.log(`\n🎉 Database working at: ${successPath}`);
    testWithModule();
  } else {
    console.log('\n❌ Failed to connect to any database path');
  }
}

module.exports = { testDatabase };