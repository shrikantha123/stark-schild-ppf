const { createClient } = require('@supabase/supabase-js');

let client = null;

// Simple in-memory cache for queries (lives across warm invocations)
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
  }

  client = createClient(url, key, {
    auth: { persistSession: false }
  });
  return client;
}

module.exports = { getSupabase };

