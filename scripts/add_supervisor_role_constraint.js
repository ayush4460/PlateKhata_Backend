require('dotenv').config();
const db = require('../src/config/database');

async function updateRoleConstraint() {
  const client = await db.pool.connect();
  try {
    console.log('Updating users table role check constraint...');
    
    // Drop the incomplete constraint
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    console.log('Dropped old constraint.');

    // Add the new constraint with all roles including 'supervisor'
    const query = `
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('super_admin', 'admin', 'supervisor', 'kitchen', 'waiter'))
    `;
    
    await client.query(query);
    console.log('Successfully added new constraint accepting: super_admin, admin, supervisor, kitchen, waiter.');

  } catch (error) {
    console.error('Failed to update role constraint:', error);
  } finally {
    client.release();
    // Close the pool to allow the script to exit
    await db.pool.end();
  }
}

updateRoleConstraint();
