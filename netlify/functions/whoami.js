exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;

  if (!user) {
    return json(401, { ok: false, error: "Not logged in" });
  }

  const roles =
    (user.app_metadata && user.app_metadata.roles) ||
    (user.user_metadata && user.user_metadata.roles) ||
    [];

  return json(200, {
    ok: true,
    email: user.email || "",
    roles,
    user
  });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}