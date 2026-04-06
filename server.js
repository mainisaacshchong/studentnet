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
// COUNCIL SYSTEM BACKEND
// ------------------------------

// Create council
app.post('/api/council/create', (req, res) => {
    if (!req.session.user) return res.json({ ok: false, error: "Not logged in" });

    const { name, description, joinMode, visibility } = req.body;
    const councils = load(FILES.councils);

    const council = {
        id: Date.now().toString(),
        name,
        description,
        joinMode,
        visibility,
        owner: req.session.user.username,
        members: [req.session.user.username],
        pending: []
    };

    councils.push(council);
    save(FILES.councils, councils);

    res.json({ ok: true, council });
});

// Browse public councils
app.get('/api/council/browse', (req, res) => {
    const councils = load(FILES.councils);
    const publicCouncils = councils.filter(c => c.visibility === "public");
    res.json(publicCouncils);
});

// Your councils
app.get('/api/council/your', (req, res) => {
    if (!req.session.user) return res.json([]);

    const councils = load(FILES.councils);
    const your = councils.filter(c => c.members.includes(req.session.user.username));
    res.json(your);
});

// Join council
app.post('/api/council/join', (req, res) => {
    if (!req.session.user) return res.json({ ok: false });

    const { councilId } = req.body;
    const councils = load(FILES.councils);
    const council = councils.find(c => c.id === councilId);

    if (!council) return res.json({ ok: false, error: "Council not found" });

    if (council.joinMode === "open") {
        if (!council.members.includes(req.session.user.username)) {
            council.members.push(req.session.user.username);
        }
        save(FILES.councils, councils);
        return res.json({ ok: true });
    }

    if (council.joinMode === "link") {
        council.members.push(req.session.user.username);
        save(FILES.councils, councils);
        return res.json({ ok: true });
    }

    if (council.joinMode === "approval") {
        if (!council.pending.includes(req.session.user.username)) {
            council.pending.push(req.session.user.username);
        }
        save(FILES.councils, councils);
        return res.json({ ok: true, pending: true });
    }
});

// Approve join request
app.post('/api/council/approve', (req, res) => {
    if (!req.session.user) return res.json({ ok: false });

    const { councilId, username } = req.body;
    const councils = load(FILES.councils);
    const council = councils.find(c => c.id === councilId);

    if (!council) return res.json({ ok: false });
    if (council.owner !== req.session.user.username) {
        return res.json({ ok: false, error: "Not owner" });
    }

    council.pending = council.pending.filter(u => u !== username);
    if (!council.members.includes(username)) {
        council.members.push(username);
    }

    save(FILES.councils, councils);
    res.json({ ok: true });
});

// Create motion
app.post('/api/motion/create', (req, res) => {
    if (!req.session.user) return res.json({ ok: false });

    const { councilId, title, description } = req.body;
    const councils = load(FILES.councils);

    const council = councils.find(c => c.id === councilId);
    if (!council) return res.json({ ok: false, error: "Council not found" });

    if (!council.members.includes(req.session.user.username)) {
        return res.json({ ok: false, error: "Not a member" });
    }

    const motions = load(FILES.motions);
    const motion = {
        id: Date.now().toString(),
        councilId,
        title,
        description,
        creator: req.session.user.username,
        supporters: [],
        articles: [],
        createdAt: Date.now()
    };

    motions.push(motion);
    save(FILES.motions, motions);

    res.json({ ok: true, motion });
});

// List all motions
app.get('/api/motion/list', (req, res) => {
    const motions = load(FILES.motions);
    res.json(motions);
});

// Motion details
app.get('/api/motion/:id', (req, res) => {
    const motions = load(FILES.motions);
    const motion = motions.find(m => m.id === req.params.id);
    res.json(motion || {});
});

// Sign motion
app.post('/api/motion/sign', (req, res) => {
    if (!req.session.user) return res.json({ ok: false });

    const { motionId } = req.body;
    const motions = load(FILES.motions);
    const motion = motions.find(m => m.id === motionId);

    if (!motion) return res.json({ ok: false });

    if (!motion.supporters.includes(req.session.user.username)) {
        motion.supporters.push(req.session.user.username);
    }

    save(FILES.motions, motions);
    res.json({ ok: true });
});

// Add article
app.post('/api/article/add', (req, res) => {
    if (!req.session.user) return res.json({ ok: false });

    const { motionId, text } = req.body;
    const motions = load(FILES.motions);
    const motion = motions.find(m => m.id === motionId);

    if (!motion) return res.json({ ok: false });

    const articles = load(FILES.articles);
    const article = {
        id: Date.now().toString(),
        motionId,
        author: req.session.user.username,
        text,
        status: "pending"
    };

    articles.push(article);
    save(FILES.articles, articles);

    res.json({ ok: true });
});

// Review article
app.post('/api/article/review', (req, res) => {
    if (!req.session.user) return res.json({ ok: false });

    const { articleId, approve } = req.body;

    const articles = load(FILES.articles);
    const motions = load(FILES.motions);

    const article = articles.find(a => a.id === articleId);
    if (!article) return res.json({ ok: false });

    const motion = motions.find(m => m.id === article.motionId);
    if (!motion) return res.json({ ok: false });

    if (motion.creator !== req.session.user.username) {
        return res.json({ ok: false, error: "Not motion owner" });
    }

    article.status = approve ? "approved" : "rejected";

    save(FILES.articles, articles);
    res.json({ ok: true });
});

// ------------------------------
// Static Assets
// ------------------------------
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ------------------------------
// Start Server
// ------------------------------
app.listen(PORT, () => {
    console.log(`StudentNet server running on http://localhost:${PORT}`);
});
