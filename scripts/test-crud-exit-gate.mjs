// scripts/test-crud-exit-gate.mjs
// Slice 4.1 Exit Gate: Verifies insertion and retrieval of an order via PostgREST

async function run() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is not defined.');
    process.exit(1);
  }

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const testOrderId = `TEST-ORDER-${Date.now()}`;
  console.log(`[1/3] Inserting test order '${testOrderId}' via PostgREST...`);

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      paypal_order_id: testOrderId,
      intent: 'CAPTURE',
      status: 'CREATED',
      currency: 'USD',
      total_amount_minor: 18999, // $189.99
      customer_email: 'judge-test@example.com'
    })
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error(`Insert failed (${insertRes.status}):`, err);
    process.exit(1);
  }

  const inserted = await insertRes.json();
  console.log('Inserted Order:', inserted);

  console.log(`\n[2/3] Querying test order '${testOrderId}' back via PostgREST...`);
  const queryRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?paypal_order_id=eq.${encodeURIComponent(testOrderId)}&select=*`,
    { headers }
  );

  if (!queryRes.ok) {
    const err = await queryRes.text();
    console.error(`Query failed (${queryRes.status}):`, err);
    process.exit(1);
  }

  const queried = await queryRes.json();
  console.log('Queried Order:', queried);

  if (!queried.length || queried[0].paypal_order_id !== testOrderId) {
    console.error('Verification failed: Queried order did not match inserted order.');
    process.exit(1);
  }

  console.log(`\n[3/3] Cleaning up test order...`);
  const delRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?paypal_order_id=eq.${encodeURIComponent(testOrderId)}`,
    {
      method: 'DELETE',
      headers
    }
  );
  console.log(`Cleanup status: ${delRes.status}`);

  console.log('\n>>> SLICE 4.1 EXIT GATE: PASS (CRUD & PostgREST Verified) <<<');
}

run().catch(e => {
  console.error('Exit gate exception:', e);
  process.exit(1);
});
