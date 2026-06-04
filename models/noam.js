import mongoose from 'mongoose';

const usuarioSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        senhaHash: { type: String, required: true },
        perfilInvestidor: { type: String },
        dataCadastro: { type: Date, default: Date.now },
    },
    { collection: 'usuarios' }
);

const setorAtivoSchema = new mongoose.Schema(
    {
        nomeSetor: { type: String, required: true, unique: true },
        descricao: { type: String },
    },
    { collection: 'setores_ativos' }
);

const ativoFinanceiroSchema = new mongoose.Schema(
    {
        ticker: { type: String, required: true, unique: true },
        tipoAtivo: { type: String, required: true },
        cotacaoAtual: { type: Number, required: true },
        ultimaAtualizacao: { type: Date, required: true, default: Date.now },
        setorAtivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'SetorAtivo' },
    },
    { collection: 'ativos_financeiros' }
);

const historicoBuscaSchema = new mongoose.Schema(
    {
        usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
        dataHoraBusca: { type: Date, required: true, default: Date.now },
        tickerBuscado: { type: String, required: true },
        sucesso: { type: Boolean, required: true },
        ativoFinanceiroId: { type: mongoose.Schema.Types.ObjectId, ref: 'AtivoFinanceiro' },
    },
    { collection: 'historicos_busca' }
);

const analiseFundamentalistaSchema = new mongoose.Schema(
    {
        historicoBuscaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HistoricoBusca',
            required: true,
            unique: true,
        },
        perfilUtilizado: { type: String, required: true },
        precoJustoGraham: { type: Number, default: null },
        precoTetoBazin: { type: Number, default: null },
        dividendYield: { type: Number, default: null },
        pvp: { type: Number, default: null },
        classificacaoGeral: { type: String, default: null },
    },
    { collection: 'analises_fundamentalistas' }
);

export const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
export const SetorAtivo = mongoose.models.SetorAtivo || mongoose.model('SetorAtivo', setorAtivoSchema);
export const AtivoFinanceiro =
    mongoose.models.AtivoFinanceiro || mongoose.model('AtivoFinanceiro', ativoFinanceiroSchema);
export const HistoricoBusca =
    mongoose.models.HistoricoBusca || mongoose.model('HistoricoBusca', historicoBuscaSchema);
export const AnaliseFundamentalista =
    mongoose.models.AnaliseFundamentalista ||
    mongoose.model('AnaliseFundamentalista', analiseFundamentalistaSchema);
