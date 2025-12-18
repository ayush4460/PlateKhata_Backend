require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('Please provide a migration filename.');
    process.exit(1);
}

const filePath = path.join(__dirname, 'migrations', migrationFile);

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

async function runMigration() {
    try {
        console.log(`Running migration: ${migrationFile}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await db.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
