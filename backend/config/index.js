/**
 * ===================
 * Config Loader
 * ===================
 * Purpose:
 *  - Load environment variables and static configuration files.
 *  - Make them accessible across modules.
 */

const fs = require('fs');
const path = require('path');

// Read and parse the rules.json config
const rulesPath = path.join(__dirname, 'rules.json');
const RULES = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

// Export both .env values and rule definitions
module.exports = {
    env: process.env.NODE_ENV || 'development',
    rules: RULES
};
