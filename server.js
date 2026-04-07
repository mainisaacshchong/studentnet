// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'studentnet-secret',
    resave: false,
    saveUninitialized: false
}));

// File upload setup
const upload = multer({ dest: 'uploads/' });

// ------------------------------
// Ensure /public/data exists
// ------------------------------
const DATA_DIR = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// JSON files
const FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    councils: path.join(DATA_DIR, 'councils.json'),
    motions: path.join(DATA_DIR, 'motions.json'),
    articles: path.join(DATA_DIR, 'articles.json'),
    boosts: path.join(DATA_DIR, 'boosts.json')
};

// Auto-create missing JSON files
for (const file of Object.values(FILES)) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
}

// Helpers
function load(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function save(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Codes in memory
const codes = {};

// Email transporter (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ------------------------------
// Static Pages
// ------------------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/council', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'council.html'));
});

app.get('/council/motion/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'motion.html'));
});

// Serve help article HTML files
app.get('/help_articles/:id', (req, res) => {
    const articleId = req.params.id;
    const filePath = path.join(__dirname, 'public', 'help_articles', `${articleId}.html`);
    res.sendFile(filePath);
});

// ------------------------------
// Auth Routes
// ------------------------------

// Signup
app.post('/auth/signup', upload.single('profilePic'), async (req, res) => {
    const { username, password, grade, classLetter, classNumber, signupCode, email } = req.body;
    if (!username || !password || !email) return res.json({ ok: false, error: "Missing fields" });

    if (signupCode !== codes[username]) {
        return res.json({ ok: false, error: "Invalid confirmation code" });
    }

    const users = load(FILES.users);
    if (users.find(u => u.username === username)) {
        return res.json({ ok: false, error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    users.push({
        username,
        email,
        password: hashed,
        grade,
        classLetter,
        classNumber,
        role: "student",
        profilePic: req.file ? `/uploads/${req.file.filename}` : "/defaultpfp.png"
    });
    save(FILES.users, users);

    res.json({ ok: true, message: "Account created successfully" });
});

// Send signup code
app.post('/auth/send-signup-code', upload.none(), (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) return res.json({ ok: false, error: "Missing fields" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes[username] = code;

    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your StudentNet Signup Code",
        text: `Your confirmation code is: ${code}`
    }, (err) => {
        if (err) return res.json({ ok: false, error: "Failed to send email" });
        res.json({ ok: true, message: "Confirmation code sent" });
    });
});

// Password login
app.post('/auth/login', upload.none(), async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ ok: false, error: "Missing username or password" });
    }

    const users = load(FILES.users);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.json({ ok: false, error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, error: "Invalid password" });

    req.session.user = user;
    res.json({ ok: true, message: "Login successful" });
});

// Current user info
app.get('/me', (req, res) => {
    if (req.session.user) res.json(req.session.user);
    else res.json({});
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ------------------------------
// Council System Backend
// ------------------------------
// (all your council, motion, article routes remain unchanged)
// ------------------------------

// Static Assets
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ------------------------------
// Start Server
// ------------------------------
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Handle port errors gracefully
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try setting a different PORT.`);
        process.exit(1);
    } else {
        throw err;
    }
});
