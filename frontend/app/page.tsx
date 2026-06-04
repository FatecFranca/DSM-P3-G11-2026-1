"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthToken, isLoggedIn } from "@/lib/auth";

type FavoritoItem = {
  ticker: string;
  tipoAtivo: "ACAO" | "FII";
  perfilUtilizado: string;
  dataFavorito: string;
};

const perfilLabel = (perfil: string) =>
  perfil ? perfil.charAt(0).toUpperCase() + perfil.slice(1) : "";

// Helpers para formatação de dados do Scanner
const formatData = (dataObj: any, forceNeutral: boolean = false) => {
  if (!dataObj) return { value: '-', cls: 'neutral' };
  if (typeof dataObj === 'object' && 'value' in dataObj) {
    return { value: dataObj.value, cls: forceNeutral ? 'neutral' : (dataObj.class || 'neutral') };
  }
  return { value: dataObj, cls: 'neutral' };
};

// Componente do Card Individual (Scanner)
const Card = ({ title, dataObj, forceNeutral = false }: { title: string, dataObj: any, forceNeutral?: boolean }) => {
  const { value, cls } = formatData(dataObj, forceNeutral);

  const renderIcon = () => {
    if (cls === 'good') return <svg style={{ color: 'var(--good)', minWidth: '24px' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
    if (cls === 'bad') return <svg style={{ color: 'var(--bad)', minWidth: '24px' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
    return null;
  };

  return (
    <div className={`card ${cls}`}>
      <div className="card-title">{title}</div>
      <div className="card-body">
        {renderIcon()}
        <span className="card-value">{value}</span>
      </div>
    </div>
  );
};

// Dados dos Flashcards Interativos de Educação
const conceitos = [
  { id: 0, title: "Renda Variável", icon: "📈", text: "Aqui o retorno é imprevisível. Os preços sobem e descem conforme a lei da oferta e procura. Exige paciência, mas oferece o maior potencial de multiplicação de patrimônio a longo prazo." },
  { id: 1, title: "Ações", icon: "🏢", text: "Uma ação é um 'pedacinho' de uma empresa. Ao comprar, você vira sócio e passa a ter direito aos lucros (dividendos) e à valorização do negócio." },
  { id: 2, title: "FIIs", icon: "🏘️", text: "Fundos Imobiliários juntam dinheiro de várias pessoas para comprar imóveis (shoppings, galpões). O aluguel recebido é dividido e pago todo mês na sua conta, isento de IR." },
  { id: 3, title: "Dividendos", icon: "💰", text: "É o 'salário' que seus investimentos te pagam. Parte do lucro líquido da empresa distribuído diretamente na conta da corretora, livre de impostos." },
];

type AppMode = 'acoes' | 'fiis' | 'educacao' | 'favoritos';

export default function Scanner() {
  const [mode, setMode] = useState<AppMode>('acoes');
  const [favoritosSubTab, setFavoritosSubTab] = useState<'acoes' | 'fiis'>('acoes');
  
  // Estados do Scanner
  const [profile, setProfile] = useState('moderado');
  const [ticker, setTicker] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<any>(null);
  const [favoritos, setFavoritos] = useState<FavoritoItem[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  // Estados da Educação Interativa
  const [eduTab, setEduTab] = useState<'conceitos' | 'simulador'>('conceitos');
  const [activeConcept, setActiveConcept] = useState(0);
  
  // Estados do Simulador
  const [simAporte, setSimAporte] = useState(500);
  const [simTempo, setSimTempo] = useState(10);
  const [simYield, setSimYield] = useState(10);

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    setTicker('');
    setResult(null);
    setStatus('idle');
    setIsFavorited(false);
    setErrorMsg('');
  };

  const authHeaders = useCallback(() => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const carregarFavoritos = useCallback(async () => {
    if (!isLoggedIn()) {
      setFavoritos([]);
      return;
    }

    try {
      const response = await fetch('/api/favoritos', {
        headers: authHeaders(),
      });
      if (!response.ok) {
        setFavoritos([]);
        return;
      }
      const data = await response.json();
      setFavoritos(data.favoritos || []);
    } catch {
      setFavoritos([]);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (isLoggedIn()) {
      void carregarFavoritos();
    } else {
      setFavoritos([]);
    }
  }, [carregarFavoritos]);

  useEffect(() => {
    const onAuthChange = () => {
      if (isLoggedIn()) void carregarFavoritos();
      else setFavoritos([]);
    };
    window.addEventListener('auth-change', onAuthChange);
    window.addEventListener('storage', onAuthChange);
    return () => {
      window.removeEventListener('auth-change', onAuthChange);
      window.removeEventListener('storage', onAuthChange);
    };
  }, [carregarFavoritos]);

  useEffect(() => {
    if (!result || !isLoggedIn()) {
      setIsFavorited(false);
      return;
    }
    const tipoAtivo = mode === 'acoes' ? 'ACAO' : 'FII';
    setIsFavorited(
      favoritos.some((f) => f.ticker === result.ticker && f.tipoAtivo === tipoAtivo)
    );
  }, [result, favoritos, mode]);

  const handleSearch = async (opts?: {
    ticker?: string;
    profile?: string;
    searchMode?: 'acoes' | 'fiis';
  }) => {
    const searchMode = opts?.searchMode ?? (mode === 'educacao' ? 'acoes' : mode);
    const trimmedTicker = (opts?.ticker ?? ticker).trim().toUpperCase();
    const searchProfile = opts?.profile ?? profile;

    if (!trimmedTicker) {
      setErrorMsg('Por favor, digite um ticker válido.');
      setStatus('error');
      return;
    }

    if (opts?.ticker) setTicker(opts.ticker);
    if (opts?.profile) setProfile(opts.profile);

    setStatus('loading');
    setResult(null);
    const endpoint = searchMode === 'acoes' ? '/api/acoes' : '/api/fiis';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ticker: trimmedTicker, profile: searchProfile }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Erro na requisição');
        setStatus('error');
        return;
      }
      setResult(data);
      setStatus('idle');
    } catch {
      setErrorMsg('Erro ao conectar com o servidor local. Verifique o terminal.');
      setStatus('error');
    }
  };

  const handleFavoritoClick = (fav: FavoritoItem) => {
    const searchMode = fav.tipoAtivo === 'ACAO' ? 'acoes' : 'fiis';
    setMode(searchMode);
    void handleSearch({
      ticker: fav.ticker,
      profile: fav.perfilUtilizado,
      searchMode,
    });
  };

  const removerFavoritoDaLista = async (fav: FavoritoItem) => {
    if (!isLoggedIn() || favBusy) return;
    setFavBusy(true);
    try {
      const response = await fetch(
        `/api/favoritos/${encodeURIComponent(fav.ticker)}?tipoAtivo=${fav.tipoAtivo}`,
        { method: 'DELETE', headers: authHeaders() }
      );
      if (response.ok) {
        setFavoritos((prev) =>
          prev.filter((f) => !(f.ticker === fav.ticker && f.tipoAtivo === fav.tipoAtivo))
        );
        if (result?.ticker === fav.ticker) {
          const tipoAtual = mode === 'acoes' ? 'ACAO' : 'FII';
          if (fav.tipoAtivo === tipoAtual) setIsFavorited(false);
        }
      }
    } finally {
      setFavBusy(false);
    }
  };

  const favoritosFiltrados = favoritos.filter((f) =>
    favoritosSubTab === 'acoes' ? f.tipoAtivo === 'ACAO' : f.tipoAtivo === 'FII'
  );

  const toggleFavorito = async () => {
    if (!result || !isLoggedIn() || favBusy) return;

    const tipoAtivo = mode === 'acoes' ? 'ACAO' : 'FII';
    setFavBusy(true);

    try {
      if (isFavorited) {
        const response = await fetch(
          `/api/favoritos/${encodeURIComponent(result.ticker)}?tipoAtivo=${tipoAtivo}`,
          { method: 'DELETE', headers: authHeaders() }
        );
        if (response.ok) {
          setIsFavorited(false);
          setFavoritos((prev) =>
            prev.filter((f) => !(f.ticker === result.ticker && f.tipoAtivo === tipoAtivo))
          );
        }
      } else {
        const response = await fetch('/api/favoritos', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            ticker: result.ticker,
            tipoAtivo,
            profile: result.perfilAtivo || profile,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setIsFavorited(true);
          setFavoritos((prev) => {
            const semDuplicata = prev.filter(
              (f) => !(f.ticker === data.favorito.ticker && f.tipoAtivo === data.favorito.tipoAtivo)
            );
            return [data.favorito, ...semDuplicata];
          });
        }
      }
    } finally {
      setFavBusy(false);
    }
  };

  // Cálculos dinâmicos do Simulador de Juros Compostos
  const calcularSimulacao = () => {
    const meses = simTempo * 12;
    const taxaMensal = (simYield / 100) / 12;
    let patrimonio = 0;
    
    for(let i = 0; i < meses; i++) {
      patrimonio = (patrimonio + simAporte) * (1 + taxaMensal);
    }
    
    const totalInvestido = simAporte * meses;
    const totalJuros = patrimonio - totalInvestido;
    const pctInvestido = Math.max(5, (totalInvestido / patrimonio) * 100);
    const rendaMensalFutura = patrimonio * taxaMensal;

    return {
      patrimonio: patrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      investido: totalInvestido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      juros: totalJuros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      renda: rendaMensalFutura.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      pctInvestido
    };
  };

  const simulacao = calcularSimulacao();

  return (
    <div className="scanner-layout">
      <div className="container">
        
        {/* CABEÇALHO E ABAS PRINCIPAIS */}
        <div className="header-tabs">
          <button className={`tab-btn ${mode === 'acoes' ? 'active' : ''}`} onClick={() => handleModeChange('acoes')}>Ações</button>
          <button className={`tab-btn ${mode === 'fiis' ? 'active' : ''}`} onClick={() => handleModeChange('fiis')}>FIIs</button>
          <button className={`tab-btn ${mode === 'favoritos' ? 'active' : ''}`} onClick={() => handleModeChange('favoritos')}>Favoritos</button>
          <button className={`tab-btn ${mode === 'educacao' ? 'active' : ''}`} onClick={() => handleModeChange('educacao')}>Educação Básica</button>
        </div>

        {/* ABA FAVORITOS */}
        {mode === 'favoritos' && (
          <div className="favoritos-page">
            <div className="results-header report-header">
              <div className="report-header-inner">
                <div>Meus Favoritos</div>
                <span className="ticker-title" style={{ fontSize: '1.35rem' }}>
                  Acompanhe ativos salvos
                </span>
              </div>
            </div>

            <div className="favoritos-subtabs">
              <button
                type="button"
                className={`tab-btn ${favoritosSubTab === 'acoes' ? 'active' : ''}`}
                onClick={() => setFavoritosSubTab('acoes')}
              >
                Ações
              </button>
              <button
                type="button"
                className={`tab-btn ${favoritosSubTab === 'fiis' ? 'active' : ''}`}
                onClick={() => setFavoritosSubTab('fiis')}
              >
                FIIs
              </button>
            </div>

            {!isLoggedIn() ? (
              <div className="message">Faça login para ver e gerenciar seus favoritos.</div>
            ) : favoritosFiltrados.length === 0 ? (
              <div className="message">
                Nenhum {favoritosSubTab === 'acoes' ? 'ação' : 'FII'} favoritado ainda. Pesquise um ativo e use o botão ☆ Favoritar no relatório.
              </div>
            ) : (
              <ul className="favoritos-panel">
                {favoritosFiltrados.map((fav) => (
                  <li key={`${fav.ticker}-${fav.tipoAtivo}`} className="favorito-card">
                    <div className="favorito-card-info">
                      <strong className="favorito-card-ticker">{fav.ticker}</strong>
                      <span className="profile-badge">{perfilLabel(fav.perfilUtilizado)}</span>
                      <span className="favorito-card-date">
                        Salvo em{' '}
                        {new Date(fav.dataFavorito).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="favorito-card-actions">
                      <button type="button" className="favorito-card-btn primary" onClick={() => handleFavoritoClick(fav)}>
                        Ver análise
                      </button>
                      <button
                        type="button"
                        className="favorito-card-btn"
                        onClick={() => void removerFavoritoDaLista(fav)}
                        disabled={favBusy}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* CONTROLES DE BUSCA (Apenas para Ações e FIIs) */}
        {mode !== 'educacao' && mode !== 'favoritos' && (
          <>
            <div className="profile-selector">
              <label htmlFor="profileSelect">Avaliar sob a ótica do Perfil:</label>
              <select id="profileSelect" value={profile} onChange={(e) => setProfile(e.target.value)}>
                <option value="conservador">Conservador (Foco em Segurança e Dividendos)</option>
                <option value="moderado">Moderado (Equilíbrio Valor e Crescimento)</option>
                <option value="arrojado">Arrojado (Foco em Crescimento Acelerado)</option>
              </select>
            </div>

            <div className="search-box">
              <input type="text" placeholder={`Digite o ticker (${mode === 'acoes' ? 'ex: PETR4, BBAS3' : 'ex: MXRF11, HGLG11'})`} value={ticker} onChange={(e) => setTicker(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <button type="button" onClick={() => handleSearch()}>Pesquisar</button>
            </div>
          </>
        )}

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div>
          {mode === 'favoritos' ? null : mode === 'educacao' ? (
            
            /* =========================================
               SESSÃO: EDUCAÇÃO E SIMULADOR
               ========================================= */
            <div className="educacao-container">
              <div className="results-header">
                Aprenda na Prática
                <span className="ticker-title">Guia Rápido</span>
              </div>

              {/* Sub-Abas da Educação */}
              <div className="edu-nav" style={{ marginBottom: '40px' }}>
                <button className={`tab-btn ${eduTab === 'conceitos' ? 'active' : ''}`} onClick={() => setEduTab('conceitos')}>Conceitos Express</button>
                <button className={`tab-btn ${eduTab === 'simulador' ? 'active' : ''}`} onClick={() => setEduTab('simulador')}>Simulador Bola de Neve</button>
              </div>

              {eduTab === 'conceitos' ? (
                /* FLASHCARDS DE CONCEITOS */
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <div className="edu-nav">
                    {conceitos.map((c) => (
                      <button key={c.id} className={`edu-pill ${activeConcept === c.id ? 'active' : ''}`} onClick={() => setActiveConcept(c.id)}>
                        {c.icon} {c.title}
                      </button>
                    ))}
                  </div>
                  
                  <div className="edu-card">
                    <h3>{conceitos[activeConcept].icon} {conceitos[activeConcept].title}</h3>
                    <p>{conceitos[activeConcept].text}</p>
                  </div>
                </div>
              ) : (
                /* SIMULADOR DE BOLA DE NEVE */
                <div className="edu-card simulador-grid">
                  <div>
                    <h3 style={{ justifyContent: 'flex-start', marginBottom: '25px' }}>❄️ O Efeito Bola de Neve</h3>
                    
                    <div className="range-group">
                      <label>Aporte Mensal: <span>R$ {simAporte}</span></label>
                      <input type="range" min="100" max="5000" step="100" value={simAporte} onChange={(e) => setSimAporte(Number(e.target.value))} />
                    </div>

                    <div className="range-group">
                      <label>Tempo Investindo (Anos): <span>{simTempo} anos</span></label>
                      <input type="range" min="1" max="35" step="1" value={simTempo} onChange={(e) => setSimTempo(Number(e.target.value))} />
                    </div>

                    <div className="range-group">
                      <label>Dividend Yield Anual: <span>{simYield}%</span></label>
                      <input type="range" min="4" max="18" step="0.5" value={simYield} onChange={(e) => setSimYield(Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="sim-result">
                    <h4>Projeção Final</h4>
                    
                    <div className="sim-row"><span>Total Tirado do Bolso:</span> <span>{simulacao.investido}</span></div>
                    <div className="sim-row"><span>Ganho com Juros/Dividendos:</span> <span style={{ color: 'var(--good)', fontWeight: 'bold' }}>+ {simulacao.juros}</span></div>
                    <div className="sim-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                      <strong>Patrimônio Total:</strong> <strong style={{ color: 'var(--primary)' }}>{simulacao.patrimonio}</strong>
                    </div>
                    
                    <div className="sim-bar">
                      <div className="sim-bar-investido" style={{ width: `${simulacao.pctInvestido}%` }}></div>
                      <div className="sim-bar-juros" style={{ width: `${100 - simulacao.pctInvestido}%` }}></div>
                    </div>
                    
                    <div className="sim-legend">
                      <span><span className="dot" style={{ background: 'var(--primary)' }}></span>Seu Bolso</span>
                      <span><span className="dot" style={{ background: 'var(--good)' }}></span>Juros (A Bola de Neve)</span>
                    </div>

                    <div className="message" style={{ padding: '15px', marginTop: '20px', fontSize: '0.95rem', background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#1b5e20' }}>
                      Ao final do período, você estaria recebendo <strong>{simulacao.renda} por mês</strong> sem precisar trabalhar!
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            /* =========================================
               SESSÃO: RESULTADOS DO SCANNER (Ações/FIIs)
               ========================================= */
            <>
              {status === 'idle' && !result && (
                <div className="message">Pronto para buscar {mode === 'acoes' ? 'Ações' : 'FIIs'}.</div>
              )}

              {status === 'loading' && (
                <div className="message">Aspirando dados de <strong>{ticker.toUpperCase()}</strong>... Aguarde.</div>
              )}

              {status === 'error' && (
                <div className="message" style={{ color: 'var(--bad)', borderLeft: '5px solid var(--bad)' }}>{errorMsg}</div>
              )}
              
              {result && status === 'idle' && (
                <>
                  <div className="results-header report-header">
                    <div className="report-header-inner">
                      <div>{mode === 'acoes' ? 'Relatório Fundamentalista' : 'Relatório do Fundo'}</div>
                      <span className="ticker-title">{result.ticker}</span>
                      {result.perfilAtivo ? (
                        <span className="profile-badge report-profile-badge">
                          {perfilLabel(result.perfilAtivo)}
                        </span>
                      ) : null}
                      {isLoggedIn() && (
                        <button
                          type="button"
                          className={`favorito-toggle ${isFavorited ? 'is-active' : ''}`}
                          onClick={toggleFavorito}
                          disabled={favBusy}
                          title={
                            isFavorited
                              ? 'Remover dos favoritos'
                              : `Salvar favorito com perfil ${perfilLabel(result.perfilAtivo || profile)}`
                          }
                        >
                          {isFavorited ? '★ Favoritado' : '☆ Favoritar'}
                        </button>
                      )}
                    </div>
                  </div>

                  {mode === 'acoes' ? (
                    <>
                      <div className="section-title">⚖️ Valuation (Preço Justo)</div>
                      <div className="results-grid">
                        <Card title="Cotação Atual" dataObj={result.cotacao} forceNeutral />
                        <Card title="Valor Justo (Graham Padrão)" dataObj={result.valorGrahamPadrao} />
                        <Card title="Valor Justo (Graham Rev.)" dataObj={result.valorGrahamRev} />
                        <Card title="Preço Teto (Bazin 6%)" dataObj={result.precoTeto6} />
                        <Card title="Preço Teto (Bazin 8%)" dataObj={result.precoTeto8} />
                      </div>

                      <div className="section-title">🏷️ Múltiplos de Preço</div>
                      <div className="results-grid">
                        <Card title="P/L" dataObj={result.pl} />
                        <Card title="P/VP" dataObj={result.pvp} />
                      </div>

                      <div className="section-title">💰 Dividendos & Proventos</div>
                      <div className="results-grid">
                        <Card title="DY (12M)" dataObj={result.dy} />
                        <Card title="Payout" dataObj={result.payout} />
                      </div>

                      <div className="section-title">📈 Indicadores de Rentabilidade</div>
                      <div className="results-grid">
                        <Card title="ROE" dataObj={result.roe} />
                        <Card title="ROIC" dataObj={result.roic} />
                        <Card title="ROA" dataObj={result.roa} />
                        <Card title="Margem Bruta" dataObj={result.margemBruta} />
                        <Card title="Margem EBITDA" dataObj={result.margemEbitda} />
                        <Card title="Margem Líquida" dataObj={result.margemLiquida} />
                      </div>

                      <div className="section-title">🏦 Endividamento & Liquidez</div>
                      <div className="results-grid">
                        <Card title="Dív. Líq./Patrimônio" dataObj={result.divLiqPatrimonio} />
                        <Card title="Dív. Líq./EBITDA" dataObj={result.divLiqEbitda} />
                        <Card title="Liquidez Corrente" dataObj={result.liquidezCorrente} />
                      </div>

                      <div className="section-title">📊 Outros Indicadores</div>
                      <div className="results-grid">
                        <Card title="LPA (Lucro por Ação)" dataObj={result.lpa} forceNeutral />
                        <Card title="VPA (Valor Patr. Ação)" dataObj={result.vpa} forceNeutral />
                        <Card title="CAGR Crescimento 5A" dataObj={result.cagr5a} />
                        <Card title="Giro Ativos" dataObj={result.giroAtivos} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="section-title">❄️ Efeito Bola de Neve (EBN)</div>
                      <div className="results-grid">
                        <Card title="Cotas p/ R$1/mês (EBN)" dataObj={result.ebn} />
                        <Card title="Valor Necessário (VN)" dataObj={result.vn} forceNeutral />
                        <Card title="Último Rendimento" dataObj={result.ultimoRendimento} forceNeutral />
                      </div>

                      <div className="section-title">🏢 Indicadores do Fundo</div>
                      <div className="results-grid">
                        <Card title="Cotação Atual" dataObj={result.cotacao} forceNeutral />
                        <Card title="P/VP" dataObj={result.pvp} />
                        <Card title="DY (12M)" dataObj={result.dy} />
                        <Card title="Liquidez Diária" dataObj={result.liquidezDiaria} />
                        <Card title="Variação (12M)" dataObj={result.variacao12m} />
                        <Card title="Val. Patr. p/ Cota" dataObj={result.vpa} forceNeutral />
                        <Card title="Valor Patrimonial" dataObj={result.valorPatrimonial} />
                        <Card title="Vacância" dataObj={result.vacancia} />
                        <Card title="Nº de Cotistas" dataObj={result.numeroCotistas} />
                      </div>

                      <div className="section-title">📋 Perfil do Fundo</div>
                      <div className="results-grid">
                        <Card title="Segmento" dataObj={result.segmento} forceNeutral />
                        <Card title="Mandato" dataObj={result.mandato} forceNeutral />
                        <Card title="Tipo de Fundo" dataObj={result.tipoFundo} forceNeutral />
                        <Card title="Tipo de Gestão" dataObj={result.tipoGestao} forceNeutral />
                        <Card title="Taxa de Admin." dataObj={result.taxaAdministracao} />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}