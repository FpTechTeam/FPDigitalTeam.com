exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { ok: false, error: "Not logged in" });

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  const formName = process.env.NETLIFY_FORM_NAME || "helmet-application";

  if (!token || !siteId) {
    return json(500, { ok: false, error: "Missing NETLIFY_ACCESS_TOKEN or NETLIFY_SITE_ID" });
  }

  try {
    // 1) Find the form by name
    const forms = await netlifyGet(`/sites/${siteId}/forms`, token);
    const form = (forms || []).find(f => (f.name || "").toLowerCase() === formName.toLowerCase());

    if (!form?.id) return json(200, { ok: true, items: [] });

    // 2) Pull submissions
    const subs = await netlifyGet(`/forms/${form.id}/submissions`, token);

    // Normalize to what employee.js expects
    const items = (subs || []).map(s => ({
      id: s.id,
      created_at: s.created_at,
      name: s.data?.name || "",
      email: s.data?.email || "",
      type: s.data?.type || "",
      status: "new" // Netlify Forms doesn’t have status; we’ll add status later if you want.
    }));

    return json(200, { ok: true, items });
  } catch (e) {
    return json(500, { ok: false, error: String(e.message || e) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}

async function netlifyGet(path, token) {
  const res = await fetch(`https://api.netlify.com/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Netlify API ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}