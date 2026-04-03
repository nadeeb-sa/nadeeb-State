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
    searchCols: ["FullName", "Phone", "Email", "City", "Nationality"],
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
    "Nationality" as nationality, "Notes" as notes, "Status" as status, "CreatedAt" as created_at`,
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
    // ── Stats mode: return distinct filter options ──────────────────
    if (searchParams.get("stats") === "true") {
      const citiesRes = await client.query(
        `SELECT DISTINCT "City" as city FROM "${table}" WHERE "City" IS NOT NULL AND "City" != '' ORDER BY "City"`
      );
      const statusesRes = await client.query(
        `SELECT DISTINCT "Status" as status FROM "${table}" WHERE "Status" IS NOT NULL ORDER BY "Status"`
      );

      let extra: Record<string, string[]> = {};

      if (type === "delegate") {
        const expRes = await client.query(
          `SELECT DISTINCT "Experience" as val FROM "DelegateLeads" WHERE "Experience" IS NOT NULL ORDER BY "Experience"`
        );
        // Extract all unique languages from JSON array column
        const langRes = await client.query(
          `SELECT DISTINCT jsonb_array_elements_text("Languages"::jsonb) as lang
           FROM "DelegateLeads"
           WHERE "Languages" IS NOT NULL AND "Languages" != '' AND "Languages" != '[]'
           ORDER BY lang`
        );
        const natRes = await client.query(
          `SELECT DISTINCT "Nationality" as val FROM "DelegateLeads"
           WHERE "Nationality" IS NOT NULL AND "Nationality" != '' ORDER BY "Nationality"`
        );
        extra = {
          experiences: expRes.rows.map((r) => r.val),
          languages: langRes.rows.map((r) => r.lang),
          nationalities: natRes.rows.map((r) => r.val),
        };
      } else if (type === "company") {
        const sizeRes = await client.query(
          `SELECT DISTINCT "CompanySize" as val FROM "CompanyLeads" WHERE "CompanySize" IS NOT NULL AND "CompanySize" != '' ORDER BY "CompanySize"`
        );
        extra = { sizes: sizeRes.rows.map((r) => r.val) };
      } else if (type === "investor") {
        const typeRes = await client.query(
          `SELECT DISTINCT "InvestorType" as val FROM "InvestorLeads" WHERE "InvestorType" IS NOT NULL AND "InvestorType" != '' ORDER BY "InvestorType"`
        );
        const countryRes = await client.query(
          `SELECT DISTINCT "Country" as val FROM "InvestorLeads" WHERE "Country" IS NOT NULL AND "Country" != '' ORDER BY "Country"`
        );
        const interestRes = await client.query(
          `SELECT DISTINCT "InterestLevel" as val FROM "InvestorLeads" WHERE "InterestLevel" IS NOT NULL AND "InterestLevel" != '' ORDER BY "InterestLevel"`
        );
        extra = {
          investorTypes: typeRes.rows.map((r) => r.val),
          countries: countryRes.rows.map((r) => r.val),
          interestLevels: interestRes.rows.map((r) => r.val),
        };
      }

      return NextResponse.json({
        cities: citiesRes.rows.map((r) => r.city),
        statuses: statusesRes.rows.map((r) => r.status),
        ...extra,
      });
    }

    // ── Build filters ───────────────────────────────────────────────
    const sort       = searchParams.get("sort")       || "newest";
    const status     = searchParams.get("status");
    const city       = searchParams.get("city");
    const search     = searchParams.get("search");
    const experience = searchParams.get("experience");  // delegate only
    const language   = searchParams.get("language");    // delegate only
    const size       = searchParams.get("size");        // company only
    const country    = searchParams.get("country");     // investor only
    const invType    = searchParams.get("investorType");// investor only
    const interest   = searchParams.get("interest");    // investor only
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

    const nationality = searchParams.get("nationality"); // delegate only

    // Delegate-specific filters
    if (type === "delegate") {
      if (experience) {
        conditions.push(`"Experience" = $${values.length + 1}`);
        values.push(experience);
      }
      if (language) {
        conditions.push(`"Languages"::jsonb @> $${values.length + 1}::jsonb`);
        values.push(JSON.stringify([language]));
      }
      if (nationality) {
        conditions.push(`"Nationality" = $${values.length + 1}`);
        values.push(nationality);
      }
    }

    // Company-specific filters
    if (type === "company") {
      if (size) {
        conditions.push(`"CompanySize" ILIKE $${values.length + 1}`);
        values.push(size);
      }
    }

    // Investor-specific filters
    if (type === "investor") {
      if (country) {
        conditions.push(`"Country" ILIKE $${values.length + 1}`);
        values.push(`%${country}%`);
      }
      if (invType) {
        conditions.push(`"InvestorType" ILIKE $${values.length + 1}`);
        values.push(invType);
      }
      if (interest) {
        conditions.push(`"InterestLevel" ILIKE $${values.length + 1}`);
        values.push(interest);
      }
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
