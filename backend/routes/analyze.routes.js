/**
 * =======================
 * Routes: /api/analyze/...
 * =======================
 * Purpose:
 *  - Organize all endpoints related to prompt analysis.
 *  - Keep route definitions separate from logic (controllers handle logic).
 */

const router = require('express').Router();
const { analyzeDemo, analyze } = require('../controllers/analyze.controller');

// GET /api/analyze/demo → Analyze a hardcoded demo prompt
router.get('/demo', analyzeDemo);

// POST /api/analyze → Analyze user-submitted prompt
router.post('/', analyze);

module.exports = router;
