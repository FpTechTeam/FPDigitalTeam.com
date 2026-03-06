import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing auth token" };
    }

    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { statusCode: 401, body: "Invalid auth token" };
    }

    const userId = userData.user.id;
    const body = JSON.parse(event.body || "{}");

    const { data, finalize } = body; // data = application json, finalize = true when submitting
    if (!data || typeof data !== "object") {
      return { statusCode: 400, body: "Invalid application data" };
    }

    // Upsert one "current" application per user (simple: latest draft)
    // You can change to multiple applications later.
    const status = finalize ? "submitted" : "draft";
    const submitted_at = finalize ? new Date().toISOString() : null;

    // Find existing draft/submitted record for the user (latest)
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("applications")
      .select("id,status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (exErr) throw exErr;

    let saved;
    if (existing && existing.length > 0 && existing[0].status === "draft") {
      const { data: upd, error: updErr } = await supabaseAdmin
        .from("applications")
        .update({ data, status, submitted_at })
        .eq("id", existing[0].id)
        .select()
        .single();
      if (updErr) throw updErr;
      saved = upd;
    } else {
      const { data: ins, error: insErr } = await supabaseAdmin
        .from("applications")
        .insert({ user_id: userId, data, status, submitted_at })
        .select()
        .single();
      if (insErr) throw insErr;
      saved = ins;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, application: saved })
    };
  } catch (e) {
    return { statusCode: 500, body: `Server error: ${e.message || "unknown"}` };
  }
}