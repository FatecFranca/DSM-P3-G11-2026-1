export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function proxyJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    return {
      ok: false as const,
      status: response.status === 404 ? 502 : response.status,
      data: {
        error:
          response.status === 404
            ? "API indisponível. Reinicie o servidor (npm run dev)."
            : `Resposta inválida do backend: ${snippet}`,
      },
    };
  }

  const data = await response.json();
  return { ok: true as const, status: response.status, data };
}
