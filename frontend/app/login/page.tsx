"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, setAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Login() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const endpoint = isLoginMode ? "/login" : "/register";

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        if (isLoginMode) {
          if (!data.token || !data.user?.email) {
            setMessage({ text: "Resposta inválida do servidor.", type: "error" });
            return;
          }
          setAuth(data.token, data.user.email);
          router.replace("/");
        } else {
          setMessage({ text: "Conta criada! Faça login.", type: "success" });
          setTimeout(() => {
            setIsLoginMode(true);
            setMessage(null);
            setPassword("");
          }, 2000);
        }
      } else {
        setMessage({ text: data.error || "Ocorreu um erro", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erro ao conectar no servidor.", type: "error" });
    }
  };

  return (
    <div className="login-layout">
      <div className="login-card">
        <h1>{isLoginMode ? "Bem-vindo" : "Criar Conta"}</h1>
        <p>
          {isLoginMode
            ? "Entre para analisar seus ativos com a Invista+"
            : "Comece a investir de forma inteligente"}
        </p>

        {message && (
          <div className={`login-msg ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              placeholder={isLoginMode ? "Sua senha" : "Crie uma senha"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-auth">
            {isLoginMode ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="toggle-link">
          {isLoginMode ? (
            <>Não tem conta? <span onClick={() => { setIsLoginMode(false); setMessage(null); }}>Criar agora</span></>
          ) : (
            <>Já tem conta? <span onClick={() => { setIsLoginMode(true); setMessage(null); }}>Fazer Login</span></>
          )}
        </div>
      </div>
    </div>
  );
}