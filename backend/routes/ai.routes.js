/**
 * =======================
 * Routes: /api/chat/...
 * =======================
 * Purpose:
 * - Organize all endpoints related to the core AI chat.
 */

const router = require('express').Router();
const { chat } = require('../controllers/ai.controller');

// POST /api/chat → Get a response from the AI
router.post('/', chat);

module.exports = router;