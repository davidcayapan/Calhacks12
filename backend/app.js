/**
 * =====================
 * Express App Bootstrap
 * =====================
 * Purpose:
 * - Initialize Express app
 * - Apply middlewares (CORS, JSON parsing)
 * - Attach routes
 * - Handle errors and 404s
 */

const express = require('express');
const cors = require('cors');
const analyzeRoutes = require('./routes/analyze.routes');
const aiRoutes = require('./routes/ai.routes'); // <-- NEW IMPORT

const app = express();

// Enable CORS for frontend communication
app.use(cors());
// Automatically parse incoming JSON bodies
app.use(express.json({ limit: '256kb' }));
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet()); // sensible security headers
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

app.use(rateLimit({
    windowMs: 60 * 1000,        // 1 minute window
    max: 120,                   // 120 req/min/IP
    standardHeaders: true,
    legacyHeaders: false
}));


// Simple health check route
app.get('/health', (_req, res) => res.json({ ok: true, status: 'healthy' }));

// Mount feature-specific routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/chat', aiRoutes);

app.use((err, _req, res, _next) => {
    console.error('💥 Unhandled error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Handle 404 errors for undefined routes
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

module.exports = app;