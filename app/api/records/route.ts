import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // delegate | company | investor
  const sort = searchParams.get("sort") || "newest"; // newest | oldest

  const order = sort === "oldest" ? "ASC" : "DESC";

  const client = await pool.connect();
  try {
    let rows: Record<string, unknown>[] = [];

    if (type === "delegate") {
      const res = await client.query(`
        SELECT
          "Id" as id,
          "FullName" as name,
          "Phone" as phone,
          "Email" as email,
          "City" as city,
          "Experience" as experience,
          "Languages" as languages,
          "Notes" as notes,
          "Status" as status,
          "CreatedAt" as created_at
        FROM "DelegateLeads"
        ORDER BY "CreatedAt" ${order}
      `);
      rows = res.rows;
    } else if (type === "company") {
      const res = await client.query(`
        SELECT
          "Id" as id,
          "CompanyName" as name,
          "ContactName" as contact,
          "Phone" as phone,
          "Email" as email,
          "LicenseNo" as license,
          "City" as city,
          "CompanySize" as size,
          "Website" as website,
          "Notes" as notes,
          "Status" as status,
          "CreatedAt" as created_at
        FROM "CompanyLeads"
        ORDER BY "CreatedAt" ${order}
      `);
      rows = res.rows;
    } else if (type === "investor") {
      const res = await client.query(`
        SELECT
          "Id" as id,
          "FullName" as name,
          "Phone" as phone,
          "Email" as email,
          "InvestorType" as investor_type,
          "Country" as country,
          "InterestLevel" as interest_level,
          "Notes" as notes,
          "Status" as status,
          "CreatedAt" as created_at
        FROM "InvestorLeads"
        ORDER BY "CreatedAt" ${order}
      `);
      rows = res.rows;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ type, total: rows.length, rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
