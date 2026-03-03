export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const data = JSON.parse(event.body || "{}");

    // TODO: validate required fields
    // Example:
    // if (!data.email) return { statusCode: 400, body: "Missing email" };

    // For now, just log it (Netlify logs)
    console.log("New application:", data);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Submit error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}