import { NextRequest, NextResponse } from "next/server";
import { API_URL, proxyJsonResponse } from "@/lib/api-proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const tipoAtivo = request.nextUrl.searchParams.get("tipoAtivo");
    const authHeader = request.headers.get("authorization");

    if (!tipoAtivo) {
      return NextResponse.json({ error: "tipoAtivo é obrigatório." }, { status: 400 });
    }

    const response = await fetch(
      `${API_URL}/api/favoritos/${encodeURIComponent(ticker)}?tipoAtivo=${encodeURIComponent(tipoAtivo)}`,
      {
        method: "DELETE",
        headers: authHeader ? { Authorization: authHeader } : {},
      }
    );

    const parsed = await proxyJsonResponse(response);
    return NextResponse.json(parsed.data, { status: parsed.status });
  } catch (error) {
    console.error("Erro ao remover favorito:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com o servidor backend." },
      { status: 500 }
    );
  }
}
