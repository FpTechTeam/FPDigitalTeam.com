exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;

  if (!user) {
    return json(401, { ok: false, error: "Not logged in" });
  }

  const roles = getRoles(user);
  const isAdmin = roles.includes("admin");

  if (!isAdmin) {
    return json(403, { ok: false, error: "Admin role required" });
  }

  return json(200, {
    ok: true,
    admin: true,
    email: user.email || "",
    roles
  });
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