import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

export const revalidate = 0;

const TABLE_MAP: Record<string, { table: string; nameCol: string; searchCols: string[] }> = {
  delegate: {
    table: "DelegateLeads",
    nameCol: "FullName",
    searchCols: ["FullName", "Phone", "Email", "City"],
  },
  company: {
    table: "CompanyLeads",
    nameCol: "CompanyName",
    searchCols: ["CompanyName", "ContactName", "Phone", "Email", "City"],
  },
  investor: {
    table: "InvestorLeads",
    nameCol: "FullName",
    searchCols: ["FullName", "Phone", "Email", "Country"],
  },
};

const SELECT_MAP: Record<string, string> = {
  delegate: `"Id" as id, "FullName" as name, "Phone" as phone, "Email" as email,
    "City" as city, "Experience" as experience, "Languages" as languages,
    "Notes" as notes, "Status" as status, "CreatedAt" as created_at`,
  company: `"Id" as id, "CompanyName" as name, "ContactName" as contact,
    "Phone" as phone, "Email" as email, "LicenseNo" as license,
    "City" as city, "CompanySize" as size, "Website" as website,
    "Notes" as notes, "Status" as status, "CreatedAt" as created_at`,
  investor: `"Id" as id, "FullName" as name, "Phone" as phone, "Email" as email,
    "InvestorType" as investor_type, "Country" as country,
    "InterestLevel" as interest_level, "Notes" as notes,
    "Status" as status, "CreatedAt" as created_at`,
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!type || !TABLE_MAP[type]) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const { table, searchCols } = TABLE_MAP[type];
  const client = await pool.connect();

  try {
    // Stats mode: return distinct filter options
    if (searchParams.get("stats") === "true") {
      const citiesRes = await client.query(
        `SELECT DISTINCT "City" as city FROM "${table}" WHERE "City" IS NOT NULL ORDER BY "City"`
      );
      const statusesRes = await client.query(
        `SELECT DISTINCT "Status" as status FROM "${table}" WHERE "Status" IS NOT NULL ORDER BY "Status"`
      );
      return NextResponse.json({
        cities: citiesRes.rows.map((r) => r.city),
        statuses: statusesRes.rows.map((r) => r.status),
      });
    }

    // Build filters
    const sort = searchParams.get("sort") || "newest";
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const order = sort === "oldest" ? "ASC" : "DESC";

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (status && status !== "all") {
      conditions.push(`"Status" = $${values.length + 1}`);
      values.push(status);
    }
    if (city) {
      conditions.push(`"City" ILIKE $${values.length + 1}`);
      values.push(`%${city}%`);
    }
    if (search) {
      const idx = values.length + 1;
      const orClauses = searchCols.map((col) => `"${col}" ILIKE $${idx}`);
      conditions.push(`(${orClauses.join(" OR ")})`);
      values.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const selectCols = SELECT_MAP[type];

    const res = await client.query(
      `SELECT ${selectCols} FROM "${table}" ${where} ORDER BY "CreatedAt" ${order}`,
      values
    );

    return NextResponse.json({ type, total: res.rows.length, rows: res.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
