/**
 * ================================
 * Entry Point: GreenPrompt Backend
 * ================================
 * Purpose:
 *  - Load environment variables
 *  - Import Express app
 *  - Start the HTTP server
 */

require('dotenv').config();          // Loads .env variables (e.g., PORT)
const app = require('./app');        // Import the configured Express app

// Use PORT from .env, or default to 3000
const port = process.env.PORT || 3000;

// Start the server
app.listen(port, () => {
    console.log(`✅ GreenPrompt backend is running on http://localhost:${port}`);
});
