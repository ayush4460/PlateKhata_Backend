require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const Encryption = require('../utils/encryption');

const seedsDir = path.join(__dirname, 'seeds');

async function runSeeds() {
  try {
    console.log('Starting database seeding...\n');

    // First, generate password hash for seed users
    console.log('Generating password hashes...');
    const passwordHash = await Encryption.hashPassword('Admin@123');
    console.log('Password hash generated\n');

    // Get all seed files
    const files = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running seed: ${file}`);
      let sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');

      // Replace password placeholder with actual hash
      sql = sql.replace(
        /\$2a\$10\$8K1p\/a0dL3\.I8\.F5\.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y/g,
        passwordHash
      );

      await db.query(sql);
      console.log(`Completed: ${file}\n`);
    }

    console.log('All seeds completed successfully!');
    console.log('\nDefault Credentials:');
    console.log('   Email: admin@restaurant.com');
    console.log('   Password: Admin@123\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runSeeds();