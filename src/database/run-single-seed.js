require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const Encryption = require('../utils/encryption');

const seedFile = process.argv[2];

if (!seedFile) {
    console.error('Please provide a seed filename (e.g. 003_axiom_seed.sql).');
    process.exit(1);
}

// Adjust path: src/database/seeds/seeds
const seedsDir = path.join(__dirname, 'seeds', 'seeds');
const filePath = path.join(seedsDir, seedFile);

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

async function runSeed() {
    try {
        console.log(`Running seed: ${seedFile}`);
        console.log('Generating password hash...');
        const passwordHash = await Encryption.hashPassword('Admin@123');
        
        let sql = fs.readFileSync(filePath, 'utf8');

        // Replace placeholder with actual hash
        sql = sql.replace(
            /\$2a\$10\$8K1p\/a0dL3\.I8\.F5\.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y/g,
            passwordHash
        );

        await db.query(sql);
        console.log('Seed completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

runSeed();
