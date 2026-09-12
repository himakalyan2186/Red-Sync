const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'life_anchor'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅  Database "${process.env.DB_NAME || 'life_anchor'}" ready`);
    await conn.end();
  } catch (err) {
    if (conn) await conn.end().catch(() => {});
    console.error('❌  Cannot connect to MySQL:', err.message);
    console.error('    → Check DB_HOST, DB_USER, DB_PASSWORD in backend/.env');
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'life_anchor',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

async function createTables() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
      age INT, gender ENUM('Male','Female','Other'),
      phone VARCHAR(20), city VARCHAR(100), pincode VARCHAR(10),
      role ENUM('donor','seeker','hospital','admin') DEFAULT 'seeker',
      last_donation_date DATE,
      donation_count INT DEFAULT 0,
      badge ENUM('Helper','Lifesaver','Hero','Life Anchor') DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS hospitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_name VARCHAR(200) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      address TEXT, city VARCHAR(100), pincode VARCHAR(10), phone VARCHAR(20),
      license_certificate VARCHAR(255),
      verified TINYINT(1) DEFAULT 0,
      verified_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS blood_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seeker_id INT NOT NULL,
      patient_name VARCHAR(100) NOT NULL,
      blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
      units INT NOT NULL DEFAULT 1,
      emergency_level ENUM('Low','Medium','Critical') DEFAULT 'Medium',
      description TEXT,
      hospital_id INT DEFAULT NULL,
      hospital_name VARCHAR(200),
      city VARCHAR(100),
      status ENUM('Pending','Accepted','Completed','Cancelled') DEFAULT 'Pending',
      accepted_by INT DEFAULT NULL,
      chat_session_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
      FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS blood_camps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      camp_name VARCHAR(200) NOT NULL,
      date DATE NOT NULL, time TIME,
      city VARCHAR(100), location TEXT, description TEXT,
      max_participants INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS camp_registrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      camp_id INT NOT NULL, user_id INT NOT NULL,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_reg (camp_id, user_id),
      FOREIGN KEY (camp_id) REFERENCES blood_camps(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS donations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      donor_id INT NOT NULL,
      request_id INT DEFAULT NULL,
      camp_id INT DEFAULT NULL,
      donation_date DATE NOT NULL,
      units INT DEFAULT 1, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE SET NULL,
      FOREIGN KEY (camp_id) REFERENCES blood_camps(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      hospital_id INT DEFAULT NULL,
      type ENUM('blood_request','camp','emergency','system') NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];
  for (const s of stmts) await pool.query(s);
  console.log('✅  All tables created/verified');
}

async function seedData() {
  const [[existing]] = await pool.query("SELECT COUNT(*) as c FROM users WHERE email='admin@lifeanchor.com'");
  if (existing.c > 0) return;
  console.log('🌱  Seeding demo data...');

  const h = (p) => bcrypt.hash(p, 10);
  const [aP, dP, sP, hP] = await Promise.all([h('Admin@123'), h('donor123'), h('seeker123'), h('hospital123')]);

  // Admin
  await pool.query(`INSERT INTO users (name,email,password,blood_group,age,gender,phone,city,role) VALUES (?,?,?,?,?,?,?,?,?)`,
    ['System Admin','admin@lifeanchor.com',aP,'O+',35,'Male','9000000000','Mumbai','admin']);

  // Donors
  const donors = [
    ['Ravi Kumar',   'ravi@demo.com',   dP,'O+', 28,'Male',  '9876543210','Mumbai',    5,'Lifesaver','2024-10-01'],
    ['Priya Singh',  'priya@demo.com',  dP,'A+', 25,'Female','9876543211','Delhi',    10,'Hero',     '2024-09-15'],
    ['Arjun Mehta',  'arjun@demo.com',  dP,'B+', 30,'Male',  '9876543212','Bangalore', 1,'Helper',   null],
    ['Sneha Patil',  'sneha@demo.com',  dP,'AB+',22,'Female','9876543213','Pune',       0,null,       null],
    ['Vikram Nair',  'vikram@demo.com', dP,'O-', 33,'Male',  '9876543214','Chennai',   25,'Life Anchor','2024-08-01'],
    ['Anita Sharma', 'anita@demo.com',  dP,'A-', 27,'Female','9876543215','Hyderabad',  3,'Helper',  '2024-11-01'],
  ];
  for (const d of donors)
    await pool.query(`INSERT INTO users (name,email,password,blood_group,age,gender,phone,city,role,donation_count,badge,last_donation_date) VALUES (?,?,?,?,?,?,?,?,'donor',?,?,?)`, d);

  // Seekers
  for (const s of [
    ['Meera Joshi','meera@demo.com',sP,'B+',45,'Female','9876500001','Mumbai'],
    ['Suresh Reddy','suresh@demo.com',sP,'O-',52,'Male','9876500002','Bangalore'],
  ]) await pool.query(`INSERT INTO users (name,email,password,blood_group,age,gender,phone,city,role) VALUES (?,?,?,?,?,?,?,?,'seeker')`, s);

  // Hospitals
  await pool.query(`INSERT INTO hospitals (hospital_name,email,password,address,city,pincode,phone,verified,verified_at) VALUES (?,?,?,?,?,?,?,1,NOW())`,
    ['City General Hospital','citygeneral@demo.com',hP,'12 MG Road','Mumbai','400001','022-12345678']);
  await pool.query(`INSERT INTO hospitals (hospital_name,email,password,address,city,pincode,phone,verified) VALUES (?,?,?,?,?,?,?,0)`,
    ['Apollo Multispecialty','apollo@demo.com',hP,'45 Baner Road','Pune','411001','020-98765432']);

  const [[hr]] = await pool.query("SELECT id FROM hospitals WHERE email='citygeneral@demo.com'");
  const [[sr]] = await pool.query("SELECT id FROM users WHERE email='meera@demo.com'");
  const [[dr]] = await pool.query("SELECT id FROM users WHERE email='ravi@demo.com'");
  const hospId=hr?.id, seekerId=sr?.id, donorId=dr?.id;

  if (seekerId && hospId) {
    const { v4: uuidv4 } = require('uuid');
    await pool.query(`INSERT INTO blood_requests (seeker_id,patient_name,blood_group,units,emergency_level,description,hospital_id,hospital_name,city,status,chat_session_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [seekerId,'Ramesh Joshi','B+',2,'Critical','Urgent surgery — patient in ICU',hospId,'City General Hospital','Mumbai','Pending',uuidv4()]);
    await pool.query(`INSERT INTO blood_requests (seeker_id,patient_name,blood_group,units,emergency_level,description,hospital_id,hospital_name,city,status,accepted_by,chat_session_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [seekerId,'Kavita Joshi','O+',1,'Medium','Scheduled surgery.',hospId,'City General Hospital','Mumbai','Accepted',donorId,uuidv4()]);
    await pool.query(`INSERT INTO blood_requests (seeker_id,patient_name,blood_group,units,emergency_level,city,status,hospital_name,chat_session_id) VALUES (?,?,?,?,?,?,?,?,?)`,
      [seekerId,'Old Patient','A+',1,'Low','Delhi','Completed','Apollo Delhi',uuidv4()]);
  }

  if (hospId) {
    await pool.query(`INSERT INTO blood_camps (hospital_id,camp_name,date,time,city,location,description,max_participants) VALUES (?,?,DATE_ADD(CURDATE(),INTERVAL 7 DAY),'09:00:00',?,?,?,?)`,
      [hospId,'World Blood Donor Day Camp 2025','Mumbai','City General Hospital – Main Hall','Free checkup & refreshments. Certificates provided.',150]);
    await pool.query(`INSERT INTO blood_camps (hospital_id,camp_name,date,time,city,location,description,max_participants) VALUES (?,?,DATE_ADD(CURDATE(),INTERVAL 21 DAY),'10:00:00',?,?,?,?)`,
      [hospId,'Thalassemia Blood Drive','Mumbai','Shivaji Park Community Centre','All blood groups needed urgently.',200]);
  }

  if (donorId) {
    await pool.query(`INSERT INTO donations (donor_id,donation_date,units) VALUES (?,DATE_SUB(CURDATE(),INTERVAL 95 DAY),1)`,[donorId]);
    await pool.query(`INSERT INTO donations (donor_id,donation_date,units) VALUES (?,DATE_SUB(CURDATE(),INTERVAL 200 DAY),1)`,[donorId]);
  }

  console.log('');
  console.log('  ─────────────────────────────────────────────────────');
  console.log('  👑  Admin     admin@lifeanchor.com   / Admin@123');
  console.log('  💉  Donor     ravi@demo.com           / donor123');
  console.log('  🙏  Seeker    meera@demo.com           / seeker123');
  console.log('  🏥  Hospital  citygeneral@demo.com    / hospital123');
  console.log('  ─────────────────────────────────────────────────────');
  console.log('');
}

async function connectDB() {
  await initializeDatabase();
  await createTables();
  await seedData();
  return pool;
}

module.exports = { pool, connectDB };
