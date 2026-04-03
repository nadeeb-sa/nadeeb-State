import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

export const revalidate = 0;

export async function GET() {
  const client = await pool.connect();
  try {
    const [delegates, companies, investors] = await Promise.all([
      client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN "CreatedAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) AS today,
          COUNT(CASE WHEN "CreatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) AS week,
          MAX("CreatedAt") AS latest
        FROM "DelegateLeads"
      `),
      client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN "CreatedAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) AS today,
          COUNT(CASE WHEN "CreatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) AS week,
          MAX("CreatedAt") AS latest
        FROM "CompanyLeads"
      `),
      client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN "CreatedAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) AS today,
          COUNT(CASE WHEN "CreatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) AS week,
          MAX("CreatedAt") AS latest
        FROM "InvestorLeads"
      `),
    ]);

    const recent = await client.query(`
      SELECT 'delegate' AS type, "Id" AS id, "FullName" AS name, "City" AS city, "CreatedAt" AS created_at
      FROM "DelegateLeads"
      UNION ALL
      SELECT 'company' AS type, "Id" AS id, "CompanyName" AS name, "City" AS city, "CreatedAt" AS created_at
      FROM "CompanyLeads"
      UNION ALL
      SELECT 'investor' AS type, "Id" AS id, "FullName" AS name, "Country" AS city, "CreatedAt" AS created_at
      FROM "InvestorLeads"
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const d = delegates.rows[0];
    const c = companies.rows[0];
    const i = investors.rows[0];

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      totals: {
        all: Number(d.total) + Number(c.total) + Number(i.total),
        delegates: Number(d.total),
        companies: Number(c.total),
        investors: Number(i.total),
      },
      today: {
        delegates: Number(d.today),
        companies: Number(c.today),
        investors: Number(i.today),
      },
      week: {
        delegates: Number(d.week),
        companies: Number(c.week),
        investors: Number(i.week),
      },
      latest: {
        delegates: d.latest,
        companies: c.latest,
        investors: i.latest,
      },
      recent: recent.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
