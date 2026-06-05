import { Favorito } from '../models/noam.js';

const PERFIS_VALIDOS = new Set(['conservador', 'moderado', 'arrojado']);
const TIPOS_VALIDOS = new Set(['ACAO', 'FII']);

export function normalizarPerfil(perfil) {
    const p = (perfil || 'moderado').toLowerCase();
    return PERFIS_VALIDOS.has(p) ? p : 'moderado';
}

export function normalizarTipoAtivo(tipo) {
    const t = (tipo || '').toUpperCase();
    return TIPOS_VALIDOS.has(t) ? t : null;
}

export async function listarFavoritos(usuarioId, tipoAtivo) {
    const filtro = { usuarioId };
    if (tipoAtivo) filtro.tipoAtivo = tipoAtivo;

    return Favorito.find(filtro)
        .sort({ dataFavorito: -1 })
        .select('ticker tipoAtivo perfilUtilizado dataFavorito')
        .lean();
}

export async function adicionarFavorito({ usuarioId, ticker, tipoAtivo, perfilUtilizado }) {
    const tickerUpper = ticker.toUpperCase();
    const perfil = normalizarPerfil(perfilUtilizado);

    const favorito = await Favorito.findOneAndUpdate(
        { usuarioId, ticker: tickerUpper, tipoAtivo },
        {
            usuarioId,
            ticker: tickerUpper,
            tipoAtivo,
            perfilUtilizado: perfil,
            dataFavorito: new Date(),
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return {
        ticker: favorito.ticker,
        tipoAtivo: favorito.tipoAtivo,
        perfilUtilizado: favorito.perfilUtilizado,
        dataFavorito: favorito.dataFavorito,
    };
}

export async function removerFavorito({ usuarioId, ticker, tipoAtivo }) {
    const result = await Favorito.deleteOne({
        usuarioId,
        ticker: ticker.toUpperCase(),
        tipoAtivo,
    });
    return result.deletedCount > 0;
}

export async function isFavorito({ usuarioId, ticker, tipoAtivo }) {
    if (!usuarioId) return false;
    const count = await Favorito.countDocuments({
        usuarioId,
        ticker: ticker.toUpperCase(),
        tipoAtivo,
    });
    return count > 0;
}
