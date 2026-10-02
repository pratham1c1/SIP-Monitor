export async function onRequestGet(context) {
  const path = context.params.path || [];

  const incomingUrl = new URL(context.request.url);

  const yahooUrl = new URL(
    `https://query1.finance.yahoo.com/${path.join("/")}`
  );

  incomingUrl.searchParams.forEach((value, key) => {
    yahooUrl.searchParams.set(key, value);
  });

  const response = await fetch(yahooUrl.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
  });

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}