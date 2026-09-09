export async function postToModal(url: string | undefined, payload: Record<string, unknown>) {
  if (!url) {
    // Fails clearly and immediately rather than letting fetch()/Next's
    // server-action error serialization produce a confusing, unrelated
    // message -- this is what happens when a Modal endpoint's env var
    // hasn't been set (e.g. before that pipeline is deployed).
    throw new Error(
      "Modal endpoint URL is not configured -- check the corresponding MODAL_*_ENDPOINT_URL env var",
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Openarchai-Secret": process.env.MODAL_SHARED_SECRET!,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Modal request failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}
