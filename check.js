const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/database.sqlite');

db.run('DELETE FROM Updates WHERE original_id IS NOT NULL', function(err) {
  if (err) console.error(err);
  else console.log('Deleted non-null original_id', this.changes);

  db.all('SELECT id, original_id, title FROM Updates WHERE lang != "en"', [], (err, rows) => {
    if (err) console.error(err);
    else console.log('Remaining non-en rows:', rows);
  });
});
