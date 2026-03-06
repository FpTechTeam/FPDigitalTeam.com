[
  {
    "title": "NSTYNK Helmet",
    "subtitle": "Advanced wearable system"
  },
  {
    "title": "Grant Strategy",
    "subtitle": "SBIR/STTR and research pipeline"
  }
]

const path = require("path");
const fs = require("fs");

exports.handler = async () => {
  try {
    const filePath = path.join(process.cwd(), "data", "projects.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const items = JSON.parse(raw);

    return json(200, {
      ok: true,
      items: Array.isArray(items) ? items : []
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: "Could not load project data"
    });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}