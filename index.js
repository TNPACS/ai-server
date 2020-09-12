require('dotenv').config();
const http = require('http');

const db = require('./db');
const app = require('./app');

const port = process.env.PORT;

(async function() {
    await db.init();

    const server = http.createServer(app);
    server.listen(port, function() {
        console.log(`AI Server listening on port ${port}`);
    });
})();

