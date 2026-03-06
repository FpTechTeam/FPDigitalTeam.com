exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;

  if (!user) {
    return json(401, { ok: false, error: "Not logged in" });
  }

  const roles = getRoles(user);
  if (!roles.includes("admin")) {
    return json(403, { ok: false, error: "Admin role required" });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const items = body.items;

    if (!Array.isArray(items)) {
      return json(400, { ok: false, error: "items must be an array" });
    }

    return json(501, {
      ok: false,
      error: "Project saving is not connected yet. Reading works, but writing needs a database or GitHub API workflow."
    });
  } catch (error) {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }
};

function getRoles(user) {
  const rolesA = user?.app_metadata?.roles;
  const rolesB = user?.user_metadata?.roles;
  const roles = Array.isArray(rolesA) ? rolesA : Array.isArray(rolesB) ? rolesB : [];
  return roles.map((r) => String(r).toLowerCase());
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}