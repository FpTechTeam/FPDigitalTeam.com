import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  try {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) return { statusCode: 401, body: "Missing auth token" };

    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return { statusCode: 401, body: "Invalid auth token" };

    const email = userData.user.email?.toLowerCase();
    if (!email) return { statusCode: 403, body: "No email on user" };

    const { data: allowed, error: allowErr } = await supabaseAdmin
      .from("employee_allowlist")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (allowErr) throw allowErr;
    if (!allowed) return { statusCode: 403, body: "Not authorized" };

    const { data: apps, error: appsErr } = await supabaseAdmin
      .from("applications")
      .select("id,user_id,status,created_at,submitted_at,updated_at,data")
      .order("submitted_at", { ascending: false, nullsFirst: true });

    if (appsErr) throw appsErr;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, applications: apps })
    };
  } catch (e) {
    return { statusCode: 500, body: `Server error: ${e.message || "unknown"}` };
  }
}