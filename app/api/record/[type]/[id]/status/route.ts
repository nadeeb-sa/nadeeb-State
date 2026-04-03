import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

export const revalidate = 0;

const TABLE_MAP: Record<string, string> = {
  delegate: "DelegateLeads",
  company: "CompanyLeads",
  investor: "InvestorLeads",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const table = TABLE_MAP[type];
  if (!table) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const { status } = await req.json();
  const allowed = ["new", "contacted", "converted", "rejected"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE "${table}" SET "Status" = $1 WHERE "Id" = $2 RETURNING "Status" as status`,
      [status, id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ status: res.rows[0].status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
