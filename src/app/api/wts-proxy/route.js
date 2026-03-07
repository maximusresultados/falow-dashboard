export async function POST(request) {
  try {
    const { path, method, body } = await request.json();
    const apiToken = request.headers.get("x-wts-token");

    if (!apiToken) {
      return Response.json({ error: "Missing token" }, { status: 401 });
    }

    const url = `https://api.wts.chat/core/v1/${path}`;
    const fetchOptions = {
      method: method || "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: "Proxy error" }, { status: 500 });
  }
}
