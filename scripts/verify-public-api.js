const app = require('../src/app');
const db = require('../src/config/database');
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const server = app.listen(0, async () => {
  try {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/v1/public`;
    const slug = 'muchmate-central';

    console.log('Verifying Public API...');

    // 1. Profile
    const profile = await fetchJson(`${baseUrl}/restaurants/${slug}`);
    if (!profile.success || profile.data.slug !== slug) {
       console.error('Profile Response:', profile);
       throw new Error('Profile verification failed');
    }
    console.log('✅ Restaurant Profile verified:', profile.data.name);

    // 2. Menu
    const menu = await fetchJson(`${baseUrl}/restaurants/${slug}/menu`);
    if (!menu.success) {
        console.error('Menu Response:', menu);
        throw new Error('Menu verification failed');
    }
    console.log(`✅ Menu verified: ${menu.data.length} items found.`);

    console.log('Verification PASSED');
    server.close();
    // Force exit to close DB pool if needed, though app usually handles it.
    process.exit(0);
  } catch (error) {
    console.error('Verification FAILED:', error);
    server.close();
    process.exit(1);
  }
});
