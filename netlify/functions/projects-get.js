exports.handler = async () => {
  // Serve a simple static JSON file from your deployed site.
  // You can later move this to a database.
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true, items: [] })
  };
};