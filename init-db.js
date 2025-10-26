// Script khởi tạo database
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const config = require('./config');

const db = new sqlite3.Database(config.database.path);

console.log('🔧 Đang khởi tạo database...');

db.serialize(async () => {
  // Bảng Admin
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bảng Products
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      icon TEXT,
      description TEXT,
      features TEXT,
      stock INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bảng Orders
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      order_note TEXT,
      items TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      payment_transaction_id TEXT,
      delivery_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bảng Accounts (Tài khoản để bán)
  db.run(`
    CREATE TABLE IF NOT EXISTS account_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      additional_info TEXT,
      status TEXT DEFAULT 'available',
      order_id INTEGER,
      sold_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // Bảng Payment Logs
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE,
      order_code TEXT,
      amount INTEGER,
      content TEXT,
      bank_code TEXT,
      status TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Đã tạo các bảng thành công!');

  // Tạo admin mặc định
  const hashedPassword = await bcrypt.hash(config.admin.password, 10);
  
  db.run(
    `INSERT OR IGNORE INTO admins (username, password, email) VALUES (?, ?, ?)`,
    [config.admin.username, hashedPassword, config.admin.email],
    (err) => {
      if (err) {
        console.log('⚠️  Admin đã tồn tại hoặc lỗi:', err.message);
      } else {
        console.log('✅ Đã tạo tài khoản admin mặc định!');
        console.log(`   Username: ${config.admin.username}`);
        console.log(`   Password: ${config.admin.password}`);
      }
    }
  );

  // Thêm sản phẩm mẫu
  const sampleProducts = [
    ['Tài Khoản Netflix Premium', 'Streaming', 50000, '🎬', 'Tài khoản Netflix Premium chất lượng cao', 
     JSON.stringify(['Xem 4K Ultra HD', 'Tối đa 4 thiết bị cùng lúc', 'Không quảng cáo', 'Bảo hành 1 tháng'])],
    ['Tài Khoản Spotify Premium', 'Music', 30000, '🎵', 'Nghe nhạc không giới hạn với chất lượng cao',
     JSON.stringify(['Nghe không giới hạn', 'Chất lượng 320kbps', 'Tải về offline', 'Bảo hành 1 tháng'])],
    ['Tài Khoản Canva Pro', 'Design', 40000, '🎨', 'Thiết kế đồ họa chuyên nghiệp',
     JSON.stringify(['Truy cập hàng triệu template', 'Xóa background tự động', 'Kích thước tùy chỉnh', 'Bảo hành 1 tháng'])],
    ['Tài Khoản YouTube Premium', 'Streaming', 45000, '📺', 'Xem YouTube không quảng cáo',
     JSON.stringify(['Không có quảng cáo', 'Phát nền', 'Tải video offline', 'Bảo hành 1 tháng'])],
    ['Tài Khoản ChatGPT Plus', 'AI', 100000, '🤖', 'Truy cập GPT-4 và các tính năng cao cấp',
     JSON.stringify(['Truy cập GPT-4', 'Ưu tiên phản hồi', 'Không giới hạn truy vấn', 'Bảo hành 1 tháng'])]
  ];

  const stmt = db.prepare(`INSERT OR IGNORE INTO products (name, category, price, icon, description, features) VALUES (?, ?, ?, ?, ?, ?)`);
  
  sampleProducts.forEach(product => {
    stmt.run(product);
  });
  
  stmt.finalize(() => {
    console.log('✅ Đã thêm sản phẩm mẫu!');
    console.log('\n🎉 Khởi tạo database hoàn tất!');
    console.log('\n📝 Tiếp theo:');
    console.log('1. Cấu hình config.js với thông tin Sepay và Telegram');
    console.log('2. Chạy: npm start');
    console.log('3. Đăng nhập admin tại: http://localhost:3000/admin');
    
    db.close();
  });
});



