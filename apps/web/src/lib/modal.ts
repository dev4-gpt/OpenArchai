export async function postToModal(url: string, payload: Record<string, unknown>) {
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
