require('dotenv').config();
const db = require('../src/config/database');

async function fixSupervisorMapping() {
  try {
    console.log('Searching for supervisors linked to Restaurant 7...');
    const result = await db.query(
      "SELECT * FROM users WHERE role = 'supervisor' AND restaurant_id = 7"
    );

    if (result.rows.length === 0) {
      console.log('No supervisors found for Restaurant 7.');
      // Also check if there is ANY supervisor for restaurant 3?
      const check3 = await db.query("SELECT * FROM users WHERE role = 'supervisor' AND restaurant_id = 3");
      console.log(`(Info) Supervisors already linked to Restaurant 3: ${check3.rowCount}`);
    } else {
        console.log(`Found ${result.rows.length} supervisor(s) linked to Restaurant 7. Updating to Restaurant 3...`);
        for (const user of result.rows) {
            console.log(`Updating user: ${user.username} (${user.email})`);
            await db.query(
                "UPDATE users SET restaurant_id = 3 WHERE user_id = $1",
                [user.user_id]
            );
        }
        console.log('All updates complete. Supervisors should now see tables for Restaurant 3.');
    }
  } catch (error) {
    console.error('Error executing script:', error);
  } finally {
      // Allow some time for pool to close or just forced exit
      setTimeout(() => process.exit(0), 500);
  }
}

fixSupervisorMapping();
