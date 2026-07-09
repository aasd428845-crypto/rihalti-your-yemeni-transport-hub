import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const tablesRes = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name;
`);
console.log("TABLES:", tablesRes.rows.map(r => r.table_name).join(", "));

const rlsRes = await client.query(`
  select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname;
`);
console.log("RLS_ENABLED:", JSON.stringify(rlsRes.rows));

const policiesRes = await client.query(`
  select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname;
`);
console.log("POLICIES_COUNT:", policiesRes.rows.length);
console.log("POLICIES_JSON_START");
console.log(JSON.stringify(policiesRes.rows, null, 2));
console.log("POLICIES_JSON_END");

await client.end();
