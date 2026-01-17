const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session Middleware
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Initialize SQLite Database
const db = new sqlite3.Database('./data.db', (err) => {
    if (err) {
        console.error('שגיאה בחיבור למסד הנתונים:', err.message);
    } else {
        console.log('✓ חוברנו למסד הנתונים SQLite');
        initializeDatabase();
    }
});

// Initialize Database Table
function initializeDatabase() {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('שגיאה בהקמת טבלת משתמשים:', err.message);
        } else {
            console.log('✓ טבלת משתמשים מוכנה');
        }
    });

    // Forms table
    db.run(`
        CREATE TABLE IF NOT EXISTS forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('שגיאה בהקמת טבלת טפסים:', err.message);
        } else {
            console.log('✓ טבלת טפסים מוכנה');
        }
    });
}

// Middleware - Check if user is logged in
function checkAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'יש להיכנס לחשבון' });
    }
    next();
}

// API Endpoint - Sign Up
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'כל השדות הם חובה' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'הסיסמה חייבת להיות 6 תווים לפחות' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'דוא"ל זה כבר קיים' });
                }
                return res.status(500).json({ error: 'שגיאה בהרשמה' });
            }

            req.session.userId = this.lastID;
            req.session.userName = name;
            console.log(`✓ משתמש חדש: ${email}`);
            res.status(200).json({ success: true, message: 'הרשמה בהצלחה' });
        }
    );
});

// API Endpoint - Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'יש למלא דוא"ל וסיסמה' });
    }

    db.get('SELECT id, name, password FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'שגיאה בחיבור' });
        }

        if (!user) {
            return res.status(401).json({ error: 'דוא"ל או סיסמה שגויים' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'דוא"ל או סיסמה שגויים' });
        }

        req.session.userId = user.id;
        req.session.userName = user.name;
        console.log(`✓ משתמש התחבר: ${email}`);
        res.status(200).json({ success: true, message: 'כניסה בהצלחה' });
    });
});

// API Endpoint - Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'שגיאה בהתנתקות' });
        }
        res.status(200).json({ success: true, message: 'התנתקת בהצלחה' });
    });
});

// API Endpoint - Get current user
app.get('/api/user', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ user: null });
    }
    res.json({
        user: {
            id: req.session.userId,
            name: req.session.userName
        }
    });
});

// API Endpoint - Submit Form
app.post('/api/submit-form', checkAuth, (req, res) => {
    const { name, email, phone, message } = req.body;
    const userId = req.session.userId;

    // Validation
    if (!name || !email) {
        return res.status(400).json({ error: 'שם ודוא"ל הם שדות חובה' });
    }

    if (!email.includes('@')) {
        return res.status(400).json({ error: 'כתובת דוא"ל לא תקינה' });
    }

    // Insert into Database
    const query = `
        INSERT INTO forms (user_id, name, email, phone, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [userId, name, email, phone || null, message || null], function(err) {
        if (err) {
            console.error('שגיאה בהוספת נתונים:', err.message);
            return res.status(500).json({ error: 'שגיאה בשמירת הנתונים' });
        }

        console.log(`✓ הנתונים נשמרו בהצלחה (ID: ${this.lastID})`);
        res.status(200).json({
            success: true,
            message: 'הנתונים נשמרו בהצלחה',
            id: this.lastID
        });
    });
});

// API Endpoint - Get All Submissions (only own data)
app.get('/api/submissions', checkAuth, (req, res) => {
    db.all(`SELECT * FROM forms WHERE user_id = ? ORDER BY created_at DESC`, [req.session.userId], (err, rows) => {
        if (err) {
            console.error('שגיאה בשליפת הנתונים:', err.message);
            return res.status(500).json({ error: 'שגיאה בשליפת הנתונים' });
        }
        res.json(rows);
    });
});

// API Endpoint - Get Single Submission
app.get('/api/submissions/:id', checkAuth, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT * FROM forms WHERE id = ? AND user_id = ?`, [id, req.session.userId], (err, row) => {
        if (err) {
            console.error('שגיאה בשליפת הנתונים:', err.message);
            return res.status(500).json({ error: 'שגיאה בשליפת הנתונים' });
        }

        if (!row) {
            return res.status(404).json({ error: 'נתונים לא נמצאו' });
        }

        res.json(row);
    });
});

// API Endpoint - Delete Submission
app.delete('/api/submissions/:id', checkAuth, (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM forms WHERE id = ? AND user_id = ?`, [id, req.session.userId], function(err) {
        if (err) {
            console.error('שגיאה במחיקת הנתונים:', err.message);
            return res.status(500).json({ error: 'שגיאה במחיקת הנתונים' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'נתונים לא נמצאו' });
        }

        res.json({ success: true, message: 'הנתונים נמחקו בהצלחה' });
    });
});

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   🚀 שרת החל להעבוד בהצלחה!          ║
╠═══════════════════════════════════════╣
║   כתובת: http://localhost:${PORT}              ║
║   טופס: http://localhost:${PORT}/              ║
║   API: http://localhost:${PORT}/api/submissions ║
╚═══════════════════════════════════════╝
    `);
});

// Handle Database Closure
process.on('SIGINT', () => {
    console.log('\n🛑 שרת מסתיים...');
    db.close((err) => {
        if (err) {
            console.error('שגיאה בסגירת מסד הנתונים:', err.message);
        } else {
            console.log('✓ מסד הנתונים סגור');
        }
        process.exit(0);
    });
});
