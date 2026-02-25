require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const setupDb = require('./db');

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

let db;

// Authentication Middleware
const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if token exists in database
        const tokenEntry = await db.get('SELECT * FROM tokens WHERE token = ? AND user_id = ?', [token, decoded.id]);

        if (!tokenEntry) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

setupDb().then(database => {
    db = database;
    console.log('Database connected and tables ready.');

    // Auth Check Endpoint
    app.get('/api/me', verifyToken, async (req, res) => {
        const user = await db.get('SELECT id, name, email, balance FROM users WHERE id = ?', [req.user.id]);
        res.json({ user });
    });

    // Register Endpoint
    app.post('/api/register', async (req, res) => {
        const { name, password, email } = req.body;
        try {
            const result = await db.run(
                'INSERT INTO users (name, password, email, balance) VALUES (?, ?, ?, ?)',
                [name, password, email, 1000]
            );
            const userId = result.lastID;

            const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' });
            const expiresAt = new Date(Date.now() + 3600000).toISOString();

            await db.run('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);

            res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
            res.status(201).json({ message: 'User registered successfully', user: { id: userId, name, email, balance: 1000 } });
        } catch (error) {
            res.status(400).json({ error: 'Registration failed: ' + error.message });
        }
    });

    // Login Endpoint
    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
            if (user) {
                const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
                const expiresAt = new Date(Date.now() + 3600000).toISOString();

                await db.run('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

                res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
                res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, balance: user.balance } });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Logout Endpoint
    app.post('/api/logout', verifyToken, async (req, res) => {
        const token = req.cookies.token;
        await db.run('DELETE FROM tokens WHERE token = ?', [token]);
        res.clearCookie('token');
        res.json({ message: 'Logged out successfully' });
    });

    // Get Balance Endpoint
    app.get('/api/balance', verifyToken, async (req, res) => {
        try {
            const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
            res.json({ balance: user.balance });
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Transfer Money Endpoint
    app.post('/api/transfer', verifyToken, async (req, res) => {
        const { toEmail, amount } = req.body;
        const transferAmount = parseFloat(amount);
        const fromId = req.user.id;

        try {
            const sender = await db.get('SELECT balance, name FROM users WHERE id = ?', [fromId]);
            const recipient = await db.get('SELECT id, name FROM users WHERE email = ?', [toEmail]);

            if (!sender || sender.balance < transferAmount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            if (!recipient) {
                return res.status(404).json({ error: 'Recipient not found' });
            }
            if (recipient.id === fromId) {
                return res.status(400).json({ error: 'Cannot transfer to yourself' });
            }

            await db.run('BEGIN TRANSACTION');
            await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [transferAmount, fromId]);
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [transferAmount, recipient.id]);

            // Log transactions
            await db.run('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [fromId, 'DEBIT', transferAmount, `Transfer to ${recipient.name}`]);
            await db.run('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [recipient.id, 'CREDIT', transferAmount, `Transfer from ${sender.name}`]);

            await db.run('COMMIT');
            res.json({ message: 'Transfer successful' });
        } catch (error) {
            await db.run('ROLLBACK');
            res.status(500).json({ error: 'Transfer failed' });
        }
    });

    // Deposit Endpoint
    app.post('/api/deposit', verifyToken, async (req, res) => {
        const { amount } = req.body;
        const depositAmount = parseFloat(amount);
        try {
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [depositAmount, req.user.id]);
            await db.run('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [req.user.id, 'CREDIT', depositAmount, 'Cash Deposit']);
            res.json({ message: 'Deposit successful' });
        } catch (error) {
            res.status(500).json({ error: 'Deposit failed' });
        }
    });

    // Withdraw Endpoint
    app.post('/api/withdraw', verifyToken, async (req, res) => {
        const { amount } = req.body;
        const withdrawAmount = parseFloat(amount);
        try {
            const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
            if (user.balance < withdrawAmount) return res.status(400).json({ error: 'Insufficient balance' });

            await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [withdrawAmount, req.user.id]);
            await db.run('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [req.user.id, 'DEBIT', withdrawAmount, 'Cash Withdrawal']);
            res.json({ message: 'Withdrawal successful' });
        } catch (error) {
            res.status(500).json({ error: 'Withdrawal failed' });
        }
    });

    // Transactions History Endpoint
    app.get('/api/transactions', verifyToken, async (req, res) => {
        try {
            const transactions = await db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 50', [req.user.id]);
            res.json({ transactions });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    });

    // AI Agent Proxy Endpoint
    app.post('/api/ai/chat', verifyToken, async (req, res) => {
        const { message } = req.body;
        const HF_API_KEY = process.env.HF_API_KEY;
        const MODEL_ID = 'CohereLabs/tiny-aya-23bc';

        try {
            const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: MODEL_ID,
                    messages: [{ role: 'system', content: 'You are a helpful banking assistant for Kodbank. Use a professional and friendly tone.' }, { role: 'user', content: message }],
                    max_tokens: 250
                })
            });

            const result = await response.json();

            if (response.ok) {
                const textResponse = result.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
                res.json({ response: textResponse });
            } else {
                console.error('HF Error:', result);
                res.status(response.status).json({ error: result.error?.message || 'AI Agent is currently unavailable' });
            }
        } catch (error) {
            console.error('AI Proxy Error:', error);
            res.status(500).json({ error: 'AI Proxy failed' });
        }
    });

    if (require.main === module) {
        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

        server.on('error', (err) => {
            console.error('Server error:', err);
        });
    }
});

module.exports = app;
