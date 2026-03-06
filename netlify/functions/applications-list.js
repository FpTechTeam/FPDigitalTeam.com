exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;

  if (!user) {
    return json(401, { ok: false, error: "Not logged in" });
  }

  const roles = getRoles(user);
  if (!roles.includes("admin")) {
    return json(403, { ok: false, error: "Admin role required" });
  }

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  const formName = process.env.NETLIFY_FORM_NAME || "helmet-application";

  if (!token || !siteId) {
    return json(500, {
      ok: false,
      error: "Missing NETLIFY_ACCESS_TOKEN or NETLIFY_SITE_ID"
    });
  }

  try {
    const forms = await netlifyGet(`/sites/${siteId}/forms`, token);
    const form = (forms || []).find(
      (f) => String(f.name || "").toLowerCase() === formName.toLowerCase()
    );

    if (!form || !form.id) {
      return json(200, { ok: true, items: [] });
    }

    const submissions = await netlifyGet(`/forms/${form.id}/submissions`, token);

    const items = (submissions || []).map((s) => ({
      id: s.id,
      created_at: s.created_at,
      name: s.data?.name || "",
      email: s.data?.email || "",
      type: s.data?.type || "",
      status: "new",
      organization: s.data?.organization || "",
      phone: s.data?.phone || "",
      linkedin: s.data?.linkedin || "",
      portfolio: s.data?.portfolio || "",
      why: s.data?.why || "",
      grant: s.data?.grant || "",
      resources: s.data?.resources || "",
      timeline: s.data?.timeline || "",
      budget: s.data?.budget || "",
      notes: s.data?.notes || ""
    }));

    return json(200, { ok: true, items });
  } catch (error) {
    return json(500, {
      ok: false,
      error: String(error.message || error)
    });
  }
};

function getRoles(user) {
  const rolesA = user?.app_metadata?.roles;
  const rolesB = user?.user_metadata?.roles;
  const roles = Array.isArray(rolesA) ? rolesA : Array.isArray(rolesB) ? rolesB : [];
  return roles.map((r) => String(r).toLowerCase());
}

async function netlifyGet(path, token) {
  const res = await fetch(`https://api.netlify.com/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Netlify API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}