export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/rankings', '');
  const target = `https://api.polyinsider.io/api/markets${path}${url.search}`;

  const response = await fetch(target, {
    method: context.request.method,
    headers: { 'Content-Type': 'application/json' },
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
