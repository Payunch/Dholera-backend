const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/data/database.sqlite');
db.serialize(() => {
  db.run("UPDATE Updates SET publishedAt = '2026-07-20 10:00:00.000 +00:00' WHERE id = 55", function(err) { console.log('Updated 55', this.changes) });
  db.run("UPDATE Updates SET publishedAt = '2026-07-21 10:00:00.000 +00:00' WHERE id IN (49, 50, 51)", function(err) { console.log('Updated others', this.changes) });
});
