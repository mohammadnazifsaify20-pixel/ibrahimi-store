// Database Helper - Makes sql.js work like better-sqlite3 API
const { getDatabase, saveDatabase } = require('./init-sqljs');

// Helper to convert sql.js results to better-sqlite3 format
function formatResults(sqlResults) {
  if (!sqlResults || sqlResults.length === 0) return [];
  
  const result = sqlResults[0];
  if (!result) return [];
  
  const rows = [];
  for (let i = 0; i < result.values.length; i++) {
    const row = {};
    for (let j = 0; j < result.columns.length; j++) {
      row[result.columns[j]] = result.values[i][j];
    }
    rows.push(row);
  }
  
  return rows;
}

// Create a wrapper that mimics better-sqlite3's prepare().get() and all()
async function getDatabaseWrapper() {
  const db = await getDatabase();
  
  return {
    prepare: (sql) => {
      return {
        get: (...params) => {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            
            if (stmt.step()) {
              const row = {};
              const columns = stmt.getColumnNames();
              columns.forEach((col, idx) => {
                row[col] = stmt.get()[idx];
              });
              stmt.free();
              return row;
            }
            stmt.free();
            return null;
          } catch (error) {
            console.error('Database get error:', error);
            return null;
          }
        },
        all: (...params) => {
          try {
            const results = db.exec(sql, params);
            return formatResults(results);
          } catch (error) {
            console.error('Database all error:', error);
            return [];
          }
        },
        run: (...params) => {
          try {
            db.run(sql, params);
            return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
          } catch (error) {
            console.error('Database run error:', error);
            throw error;
          }
        }
      };
    },
    exec: (sql) => {
      try {
        db.exec(sql);
      } catch (error) {
        console.error('Database exec error:', error);
        throw error;
      }
    },
    transaction: (fn) => {
      return (data) => {
        try {
          db.run('BEGIN TRANSACTION');
          const result = fn(data);
          db.run('COMMIT');
          return result;
        } catch (error) {
          db.run('ROLLBACK');
          throw error;
        }
      };
    }
  };
}

module.exports = {
  getDatabase: getDatabaseWrapper,
  saveDatabase
};
