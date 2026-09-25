const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3333;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const certsDir = path.join(dataDir, 'certs');
const dbFile = path.join(dataDir, 'nexfarmapro.db');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir);

// Setup SQLite Database
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error('Error opening database', err);
});

// Initialize Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        role TEXT,
        permissions TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT,
        valid_until TEXT,
        filename TEXT,
        has_password BOOLEAN
    )`);
});

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for Certificate Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, certsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `certificado_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// --- API ROUTES ---

// 1. Users
app.get('/api/users', (req, res) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    const { name, role, permissions } = req.body;
    db.run(`INSERT INTO users (name, role, permissions) VALUES (?, ?, ?)`, 
        [name, role, JSON.stringify(permissions)], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, role, permissions });
        }
    );
});

// 2. Certificate Upload
app.get('/api/certificate', (req, res) => {
    db.get(`SELECT * FROM certificates ORDER BY id DESC LIMIT 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || null);
    });
});

app.post('/api/certificate', upload.single('certificado'), (req, res) => {
    const { companyName, validUntil } = req.body;
    const filename = req.file ? req.file.filename : null;
    
    if (!filename) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    db.run(`INSERT INTO certificates (company_name, valid_until, filename, has_password) VALUES (?, ?, ?, ?)`, 
        [companyName, validUntil, filename, true], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, companyName, message: 'Certificado salvo localmente com sucesso!' });
        }
    );
});

// Start Server
app.listen(PORT, () => {
    console.log(`Coração Local do NexFarmaPro rodando na porta ${PORT}`);
    console.log(`Banco de dados: ${dbFile}`);
});
