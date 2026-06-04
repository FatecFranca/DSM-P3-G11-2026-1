import {
    Usuario,
    SetorAtivo,
    AtivoFinanceiro,
    HistoricoBusca,
    AnaliseFundamentalista,
} from '../models/noam.js';

export function calcularClassificacaoGeral(payload) {
    const ignorar = new Set(['ticker', 'perfilAtivo']);
    let good = 0;
    let bad = 0;

    for (const [key, item] of Object.entries(payload)) {
        if (ignorar.has(key) || !item || typeof item !== 'object') continue;
        if (item.class === 'good') good++;
        if (item.class === 'bad') bad++;
    }

    if (good > bad) return 'Favorável';
    if (bad > good) return 'Desfavorável';
    return 'Neutro';
}

async function resolverSetorAtivoId(setorNome, setorDescricao) {
    if (!setorNome) return null;

    const setor = await SetorAtivo.findOneAndUpdate(
        { nomeSetor: setorNome },
        {
            $setOnInsert: {
                nomeSetor: setorNome,
                descricao: setorDescricao || '',
            },
        },
        { upsert: true, new: true }
    );

    return setor._id;
}

export async function persistirFluxoNoam({
    usuarioId,
    ticker,
    tipoAtivo,
    cotacao,
    perfilUtilizado,
    sucesso,
    setorNome,
    setorDescricao,
    analise,
}) {
    if (!usuarioId) return null;

    await Usuario.findByIdAndUpdate(usuarioId, { perfilInvestidor: perfilUtilizado });

    const tickerUpper = ticker.toUpperCase();
    let ativoFinanceiroId = null;

    if (sucesso && cotacao != null) {
        const setorAtivoId = await resolverSetorAtivoId(setorNome, setorDescricao);

        const ativo = await AtivoFinanceiro.findOneAndUpdate(
            { ticker: tickerUpper },
            {
                ticker: tickerUpper,
                tipoAtivo,
                cotacaoAtual: cotacao,
                ultimaAtualizacao: new Date(),
                ...(setorAtivoId ? { setorAtivoId } : {}),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        ativoFinanceiroId = ativo._id;
    }

    const historico = await HistoricoBusca.create({
        usuarioId,
        dataHoraBusca: new Date(),
        tickerBuscado: tickerUpper,
        sucesso,
        ...(ativoFinanceiroId ? { ativoFinanceiroId } : {}),
    });

    if (sucesso && analise) {
        await AnaliseFundamentalista.create({
            historicoBuscaId: historico._id,
            perfilUtilizado,
            ...analise,
        });
    }

    return historico._id;
}
