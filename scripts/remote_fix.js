const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../data/database.sqlite');
console.log('Using DB:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("UPDATE Updates SET publishedAt = '2026-07-20 10:00:00.000 +00:00' WHERE id = 164", function(err) {
        if(err) console.error(err); else console.log('Updated 164:', this.changes);
    });
    db.run("UPDATE Updates SET publishedAt = '2026-07-21 10:00:00.000 +00:00' WHERE id IN (165, 166, 167)", function(err) {
        if(err) console.error(err); else console.log('Updated 165, 166, 167:', this.changes);
    });
});
