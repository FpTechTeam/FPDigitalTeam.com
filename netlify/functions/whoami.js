exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Not logged in" }) };

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: true,
      email: user.email,
      roles: (user.app_metadata && user.app_metadata.roles) || (user.user_metadata && user.user_metadata.roles) || []
    })
  };
};