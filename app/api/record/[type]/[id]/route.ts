import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const client = await pool.connect();
  try {
    let row = null;
    if (type === "delegate") {
      const res = await client.query(
        `SELECT "Id" as id, "FullName" as name, "Phone" as phone, "Email" as email,
         "City" as city, "Experience" as experience, "Languages" as languages,
         "Notes" as notes, "Status" as status, "CreatedAt" as created_at
         FROM "DelegateLeads" WHERE "Id" = $1`,
        [id]
      );
      row = res.rows[0];
    } else if (type === "company") {
      const res = await client.query(
        `SELECT "Id" as id, "CompanyName" as name, "ContactName" as contact,
         "Phone" as phone, "Email" as email, "LicenseNo" as license,
         "City" as city, "CompanySize" as size, "Website" as website,
         "Notes" as notes, "Status" as status, "CreatedAt" as created_at
         FROM "CompanyLeads" WHERE "Id" = $1`,
        [id]
      );
      row = res.rows[0];
    } else if (type === "investor") {
      const res = await client.query(
        `SELECT "Id" as id, "FullName" as name, "Phone" as phone, "Email" as email,
         "InvestorType" as investor_type, "Country" as country,
         "InterestLevel" as interest_level, "Notes" as notes,
         "Status" as status, "CreatedAt" as created_at
         FROM "InvestorLeads" WHERE "Id" = $1`,
        [id]
      );
      row = res.rows[0];
    }
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ type, row });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
