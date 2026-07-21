const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../data/database.sqlite');
console.log('Using DB:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, title, publishedAt FROM Updates WHERE title LIKE '%Ultimate Investment Destination%' OR publishedAt LIKE '%2026-07-17%'", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
    });
});
