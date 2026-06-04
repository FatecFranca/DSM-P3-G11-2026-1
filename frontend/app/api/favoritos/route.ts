import { NextRequest, NextResponse } from "next/server";
import { API_URL, proxyJsonResponse } from "@/lib/api-proxy";

function authHeaders(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };
}

export async function GET(request: NextRequest) {
  try {
    const tipoAtivo = request.nextUrl.searchParams.get("tipoAtivo");
    const query = tipoAtivo ? `?tipoAtivo=${encodeURIComponent(tipoAtivo)}` : "";

    const response = await fetch(`${API_URL}/api/favoritos${query}`, {
      headers: authHeaders(request),
    });

    const parsed = await proxyJsonResponse(response);
    return NextResponse.json(parsed.data, { status: parsed.status });
  } catch (error) {
    console.error("Erro ao listar favoritos:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com o servidor backend." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/api/favoritos`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(body),
    });

    const parsed = await proxyJsonResponse(response);
    return NextResponse.json(parsed.data, { status: parsed.status });
  } catch (error) {
    console.error("Erro ao favoritar:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com o servidor backend." },
      { status: 500 }
    );
  }
}
