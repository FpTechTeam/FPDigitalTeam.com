// /functions/api/auth/bootstrap.js
// One-time admin creator. Safe because:
// 1) Requires BOOTSTRAP_TOKEN secret
// 2) Refuses to run if ANY users already exist
// After you create your admin user, DISABLE this route (delete the file or lock it).

export async function onRequestPost({ request, env }) {
  if (!env.BOOTSTRAP_TOKEN) {
    return json({ error: "Server missing BOOTSTRAP_TOKEN" }, 500);
  }

  const body = await request.json().catch(() => null);
  if (!body?.token || !body?.username || !body?.password) {
    return json({ error: "Missing token/username/password" }, 400);
  }

  const token = String(body.token).trim();
  if (token !== env.BOOTSTRAP_TOKEN) {
    return json({ error: "Invalid bootstrap token" }, 403);
  }

  // Refuse if any users already exist
  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
  if ((countRow?.c ?? 0) > 0) {
    return json({ error: "Bootstrap disabled: users already exist" }, 409);
  }

  const username = String(body.username).trim().toLowerCase();
  const password = String(body.password);

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return json({ error: "Username must be 3-32 chars: a-z 0-9 . _ -" }, 400);
  }
  if (password.length < 10) {
    return json({ error: "Password must be at least 10 characters" }, 400);
  }

  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await pbkdf2(password, saltBytes);

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Default admin permissions (edit these anytime later)
  const role = "admin";
  const permissions = [
    "apps:read",
    "apps:write",
    "projects:read",
    "projects:write",
    "users:read",
    "users:write"
  ];

  await env.DB.prepare(`
    INSERT INTO users (
      id, created_at, username, password_hash, password_salt, role, permissions_json, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    userId,
    now,
    username,
    bytesToBase64(hashBytes),
    bytesToBase64(saltBytes),
    role,
    JSON.stringify(permissions)
  ).run();

  return json({
    ok: true,
    created: { username, role },
    next: "DELETE /functions/api/auth/bootstrap.js or block /api/auth/bootstrap in Access after you confirm login works."
  }, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

// PBKDF2-SHA256
async function pbkdf2(password, saltBytes) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 210000, hash: "SHA-256" },
    key,
    256
  );

  return new Uint8Array(bits);
}

function bytesToBase64(bytes) {
  let bin = "";
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}