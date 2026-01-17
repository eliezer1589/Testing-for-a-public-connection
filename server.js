const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

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
    db.run(`
        CREATE TABLE IF NOT EXISTS forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('שגיאה בהקמת הטבלה:', err.message);
        } else {
            console.log('✓ הטבלה מוכנה');
        }
    });
}

// API Endpoint - Submit Form
app.post('/api/submit-form', (req, res) => {
    const { name, email, phone, message } = req.body;

    // Validation
    if (!name || !email) {
        return res.status(400).json({ error: 'שם ודוא"ל הם שדות חובה' });
    }

    if (!email.includes('@')) {
        return res.status(400).json({ error: 'כתובת דוא"ל לא תקינה' });
    }

    // Insert into Database
    const query = `
        INSERT INTO forms (name, email, phone, message)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [name, email, phone || null, message || null], function(err) {
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

// API Endpoint - Get All Submissions
app.get('/api/submissions', (req, res) => {
    db.all(`SELECT * FROM forms ORDER BY created_at DESC`, (err, rows) => {
        if (err) {
            console.error('שגיאה בשליפת הנתונים:', err.message);
            return res.status(500).json({ error: 'שגיאה בשליפת הנתונים' });
        }
        res.json(rows);
    });
});

// API Endpoint - Get Single Submission
app.get('/api/submissions/:id', (req, res) => {
    const { id } = req.params;

    db.get(`SELECT * FROM forms WHERE id = ?`, [id], (err, row) => {
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
app.delete('/api/submissions/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM forms WHERE id = ?`, [id], function(err) {
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
