// scripts/verify-db-tables.mjs
// Verifies whether tables are present in Supabase PostgREST schema cache

async function check() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is not defined in environment.');
    process.exit(1);
  }

  const tables = ['orders', 'events', 'expectations', 'incidents', 'chaos_rules'];
  const results = {};

  console.log(`Checking PostgREST tables on ${new URL(supabaseUrl).hostname}...`);

  for (const table of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      });
      results[table] = {
        status: res.status,
        ok: res.ok,
        statusText: res.statusText
      };
      if (!res.ok) {
        const text = await res.text();
        results[table].error = text;
      }
    } catch (err) {
      results[table] = { error: err.message };
    }
  }

  console.log('Results:', JSON.stringify(results, null, 2));

  const allOk = tables.every(t => results[t].ok);
  if (allOk) {
    console.log('>>> ALL 5 TABLES VERIFIED IN POSTGREST! <<<');
    process.exit(0);
  } else {
    console.log('>>> SOME TABLES NOT READY IN POSTGREST <<<');
    process.exit(2);
  }
}

check().catch(e => {
  console.error('Check failed:', e);
  process.exit(1);
});
