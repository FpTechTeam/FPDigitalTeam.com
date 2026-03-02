exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not logged in" }) };

  const roles = (user.app_metadata && user.app_metadata.roles) || (user.user_metadata && user.user_metadata.roles) || [];
  const isAdmin = Array.isArray(roles) && roles.map(r => String(r).toLowerCase()).includes("admin");

  if (!isAdmin) return { statusCode: 403, body: JSON.stringify({ ok: false, error: "Admin role required" }) };

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true, admin: true, email: user.email, roles })
  };
};