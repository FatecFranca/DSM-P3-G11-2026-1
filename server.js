import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Garante que seu login.html e index.html sejam lidos
// ======================================================================
// 1. CONFIGURAÇÃO DO BANCO DE DADOS NOSQL (MONGODB)
// ======================================================================

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Banco de Dados NoSQL (MongoDB Atlas) conectado com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Banco de Dados NoSQL (MongoDB) conectado com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// Criando a "Entidade" Usuario exatamente como no seu Diagrama NoAM
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    senhaHash: { type: String, required: true },
    dataCadastro: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', userSchema);

const JWT_SECRET = 'minha_chave_secreta_super_segura_2026'; // Chave para gerar os tokens

// ======================================================================
// 2. ROTAS DE AUTENTICAÇÃO (O QUE O SEU LOGIN.HTML CHAMA)
// ======================================================================

// Rota de Cadastro
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verifica se o usuário já existe
        const userExists = await Usuario.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
        }

        // Criptografa a senha antes de salvar no NoSQL
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        // Salva no banco de dados
        const novoUsuario = new Usuario({ email, senhaHash });
        await novoUsuario.save();

        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Rota de Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Busca o usuário pelo e-mail
        const user = await Usuario.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
        }

        // Compara a senha digitada com o Hash salvo no banco
        const isMatch = await bcrypt.compare(password, user.senhaHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
        }

        // Gera o Token de Acesso (Crachá virtual)
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: { email: user.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// ======================================================================
// 3. MOTOR DE SCRAPING E JUIZ FUNDAMENTALISTA (MANTIDO INTACTO)
// ======================================================================

const axiosConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
    },
    timeout: 15000 
};

function normalizeKey(str) {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");      
}

function parseForMath(str) {
    if (!str || typeof str !== 'string') return null;
    if (str.includes('N/A') || str.trim() === '-') return null;
    const match = str.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/);
    if (!match) return null;
    const cleaned = match[0].replace(/\./g, '').replace(',', '.');
    let num = parseFloat(cleaned);
    const suffix = str.substring(str.indexOf(match[0]) + match[0].length).trim().toUpperCase();
    if (suffix.startsWith('B') || suffix.startsWith('BILH')) num *= 1000000000;
    else if (suffix.startsWith('M') || suffix.startsWith('MILH')) num *= 1000000;
    else if (suffix.startsWith('K') || suffix.startsWith('MIL')) num *= 1000;
    return isNaN(num) ? null : num;
}

function formatCurrency(num) { 
    if (num === null || isNaN(num)) return '-';
    return `R$ ${num.toFixed(2).replace('.', ',')}`; 
}

function formatPercent(num) { 
    if (num === null || isNaN(num)) return '-';
    return `${num.toFixed(2).replace('.', ',')}%`; 
}

function formNum(num) { 
    if (num === null || isNaN(num)) return '-';
    return num.toFixed(2).replace('.', ','); 
}

function classifyAcao(indicator, value, profile) {
    if (value === null || value === undefined || isNaN(value)) return 'neutral';
    switch (indicator) {
        case 'pl':
            if (profile === 'conservador') {
                if (value > 0 && value < 8) return 'good';
                if (value >= 8 && value <= 12) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 10 && value <= 20) return 'good';
                if (value > 20 && value <= 30) return 'neutral';
                return 'bad';
            } else {
                if (value >= 5 && value <= 10) return 'good';
                if (value > 10 && value <= 15) return 'neutral';
                return 'bad';
            }
        case 'pvp':
            if (profile === 'conservador') {
                if (value >= 0.50 && value <= 1.00) return 'good';
                if (value > 1.00 && value <= 1.20) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 1.00 && value <= 1.50) return 'good';
                if (value > 1.50 && value <= 3.00) return 'neutral';
                return 'bad';
            } else {
                if (value >= 0.80 && value <= 1.00) return 'good';
                if (value > 1.00 && value <= 1.50) return 'neutral';
                return 'bad';
            }
        case 'dy':
            if (profile === 'conservador') {
                if (value > 8) return 'good';
                if (value >= 5 && value <= 8) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 10) return 'good';
                if (value >= 6 && value < 10) return 'neutral';
                return 'bad';
            } else {
                if (value > 6) return 'good';
                if (value >= 4 && value <= 6) return 'neutral';
                return 'bad';
            }
        case 'roe':
            if (profile === 'conservador') {
                if (value > 15) return 'good';
                if (value >= 10 && value <= 15) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 20) return 'good';
                if (value >= 12 && value <= 20) return 'neutral';
                return 'bad';
            } else {
                if (value > 12) return 'good';
                if (value >= 8 && value <= 12) return 'neutral';
                return 'bad';
            }
        case 'roic':
            if (profile === 'conservador') {
                if (value > 15) return 'good';
                if (value >= 10 && value <= 15) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 18) return 'good';
                if (value >= 10 && value <= 18) return 'neutral';
                return 'bad';
            } else {
                if (value > 12) return 'good';
                if (value >= 8 && value <= 12) return 'neutral';
                return 'bad';
            }
        case 'roa':
            if (profile === 'conservador') {
                if (value > 8) return 'good';
                if (value >= 5 && value <= 8) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 10) return 'good';
                if (value >= 5 && value <= 10) return 'neutral';
                return 'bad';
            } else {
                if (value > 6) return 'good';
                if (value >= 4 && value <= 6) return 'neutral';
                return 'bad';
            }
        case 'margemLiquida':
            if (profile === 'conservador') {
                if (value > 15) return 'good';
                if (value >= 10 && value <= 15) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 8) return 'good';
                if (value >= 3 && value <= 8) return 'neutral';
                return 'bad';
            } else {
                if (value > 10) return 'good';
                if (value >= 5 && value <= 10) return 'neutral';
                return 'bad';
            }
        case 'margemBruta':
            if (profile === 'conservador') {
                if (value > 40) return 'good';
                if (value >= 30 && value <= 40) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 45) return 'good';
                if (value >= 25 && value <= 45) return 'neutral';
                return 'bad';
            } else {
                if (value > 30) return 'good';
                if (value >= 20 && value <= 30) return 'neutral';
                return 'bad';
            }
        case 'margemEbitda':
            if (profile === 'conservador') {
                if (value > 25) return 'good';
                if (value >= 15 && value <= 25) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 20) return 'good';
                if (value >= 10 && value <= 20) return 'neutral';
                return 'bad';
            } else {
                if (value > 15) return 'good';
                if (value >= 10 && value <= 15) return 'neutral';
                return 'bad';
            }
        case 'giroAtivos':
            if (profile === 'conservador') {
                if (value > 1.0) return 'good';
                if (value >= 0.6 && value <= 1.0) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 1.2) return 'good';
                if (value >= 0.8 && value <= 1.2) return 'neutral';
                return 'bad';
            } else {
                if (value > 0.8) return 'good';
                if (value >= 0.5 && value <= 0.8) return 'neutral';
                return 'bad';
            }
        case 'divPatrimonio':
            if (profile === 'conservador') {
                if (value < 0.30) return 'good';
                if (value >= 0.30 && value <= 0.50) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 0.50 && value <= 1.50) return 'good';
                if (value > 1.50 && value <= 2.50) return 'neutral';
                return 'bad';
            } else {
                if (value < 0.50) return 'good';
                if (value >= 0.50 && value <= 1.50) return 'neutral';
                return 'bad';
            }
        case 'divLiqEbitda':
            if (profile === 'conservador') {
                if (value < 1.0) return 'good';
                if (value >= 1.0 && value <= 1.5) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 1.5 && value <= 2.5) return 'good';
                if (value > 2.5 && value <= 3.5) return 'neutral';
                return 'bad';
            } else {
                if (value < 1.5) return 'good';
                if (value >= 1.5 && value <= 2.5) return 'neutral';
                return 'bad';
            }
        case 'liquidezCorrente':
            if (profile === 'conservador') {
                if (value > 2.0) return 'good';
                if (value >= 1.5 && value <= 2.0) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 1.2) return 'good';
                if (value >= 0.8 && value <= 1.2) return 'neutral';
                return 'bad';
            } else {
                if (value > 1.5) return 'good';
                if (value >= 1.0 && value <= 1.5) return 'neutral';
                return 'bad';
            }
        case 'cagr5a':
            if (profile === 'conservador') {
                if (value > 5) return 'good';
                if (value >= 2 && value <= 5) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 20) return 'good';
                if (value >= 10 && value <= 20) return 'neutral';
                return 'bad';
            } else {
                if (value > 10) return 'good';
                if (value >= 5 && value <= 10) return 'neutral';
                return 'bad';
            }
        case 'payout':
            if (profile === 'conservador') {
                if (value > 60) return 'good';
                if (value >= 40 && value <= 60) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value < 30) return 'good';
                if (value >= 30 && value <= 50) return 'neutral';
                return 'bad';
            } else {
                if (value >= 40 && value <= 70) return 'good';
                if (value >= 25 && value < 40 || value > 70 && value <= 100) return 'neutral';
                return 'bad';
            }
        default: return 'neutral';
    }
}

function classifyFii(indicator, value, profile) {
    if (value === null || value === undefined || isNaN(value)) return 'neutral';
    switch (indicator) {
        case 'pvp': 
            if (profile === 'conservador') {
                if (value >= 0.90 && value <= 0.98) return 'good';
                if (value > 0.98 && value <= 1.05) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 0.70 && value <= 0.85) return 'good';
                if (value > 0.85 && value <= 1.00) return 'neutral';
                return 'bad';
            } else {
                if (value >= 0.85 && value <= 0.98) return 'good';
                if (value > 0.98 && value <= 1.05) return 'neutral';
                return 'bad';
            }
        case 'dy': 
            if (profile === 'conservador') {
                if (value >= 8 && value <= 10) return 'good';
                if (value >= 6 && value < 8) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 13) return 'good';
                if (value >= 10 && value <= 13) return 'neutral';
                return 'bad';
            } else {
                if (value >= 9 && value <= 12) return 'good';
                if (value >= 7 && value < 9) return 'neutral';
                if (value > 12 && value <= 13) return 'neutral';
                return 'bad';
            }
        case 'liquidezDiaria':
            if (profile === 'conservador') {
                if (value > 2000000) return 'good';
                if (value >= 1000000 && value <= 2000000) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value > 300000) return 'good';
                if (value >= 100000 && value <= 300000) return 'neutral';
                return 'bad';
            } else {
                if (value > 1000000) return 'good';
                if (value >= 500000 && value <= 1000000) return 'neutral';
                return 'bad';
            }
        case 'variacao12m':
            if (profile === 'conservador') {
                if (value >= -5 && value <= -2) return 'good';
                if (value > -2 && value <= 5) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value < -15) return 'good';
                if (value >= -15 && value <= -5) return 'neutral';
                return 'bad';
            } else {
                if (value >= -10 && value <= -5) return 'good';
                if (value > -5 && value <= 10) return 'neutral';
                return 'bad';
            }
        case 'valorPatrimonial':
            if (profile === 'conservador') {
                if (value > 2000000000) return 'good';
                if (value >= 1000000000 && value <= 2000000000) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 100000000 && value <= 500000000) return 'good';
                if (value > 500000000) return 'neutral';
                return 'bad';
            } else {
                if (value > 1000000000) return 'good';
                if (value >= 500000000 && value <= 1000000000) return 'neutral';
                return 'bad';
            }
        case 'vacancia':
            if (profile === 'conservador') {
                if (value === 0) return 'good';
                if (value > 0 && value <= 5) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value >= 15 && value <= 30) return 'good';
                if (value >= 10 && value < 15) return 'neutral';
                return 'bad';
            } else {
                if (value < 5) return 'good';
                if (value >= 5 && value <= 10) return 'neutral';
                return 'bad';
            }
        case 'numeroCotistas':
            if (profile === 'conservador') {
                if (value > 100000) return 'good';
                if (value >= 50000 && value <= 100000) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value < 10000) return 'good';
                if (value >= 10000 && value <= 30000) return 'neutral';
                return 'bad';
            } else {
                if (value > 50000) return 'good';
                if (value >= 15000 && value <= 50000) return 'neutral';
                return 'bad';
            }
        case 'taxaAdministracao':
            if (profile === 'conservador') {
                if (value < 0.8) return 'good';
                if (value >= 0.8 && value <= 1.0) return 'neutral';
                return 'bad';
            } else if (profile === 'arrojado') {
                if (value < 1.0) return 'good';
                if (value >= 1.0 && value <= 1.5) return 'neutral';
                return 'bad';
            } else {
                if (value < 0.9) return 'good';
                if (value >= 0.9 && value <= 1.1) return 'neutral';
                return 'bad';
            }
        default: return 'neutral';
    }
}

app.post('/api/acoes', async (req, res) => {
    const { ticker, profile } = req.body;
    if (!ticker) return res.status(400).json({ error: 'Ticker não informado' });
    const userProfile = profile || 'moderado';

    try {
        const { data } = await axios.get(`https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`, axiosConfig);
        const $ = cheerio.load(data);
        const dict = {};

        const cotacaoStr = $('.value').first().text().trim();
        dict['cotacao'] = parseForMath(cotacaoStr);

        $('._card').each((_, el) => {
            const title = $(el).find('._card-header span').text().trim();
            let value = $(el).find('._card-body > div > span').first().text().trim();
            if (!value) value = $(el).find('._card-body > span').first().text().trim();
            if (title && value) dict[normalizeKey(title)] = parseForMath(value);
        });

        $('.cell').each((_, el) => {
            const title = $(el).find('span').first().text().trim();
            const value = $(el).find('.value span').first().text().trim();
            if (title && value) dict[normalizeKey(title)] = parseForMath(value);
        });

        const cotacao = dict['cotacao'];
        const pl = dict['pl'];
        const pvp = dict['pvp'];
        const dy = dict['dy'];
        const payout = dict['payout'];
        const roe = dict['roe'];
        const roic = dict['roic'];
        const roa = dict['roa'];
        const margemBruta = dict['margembruta'];
        const margemEbitda = dict['margemebtida'] || dict['margemebitda']; 
        const margemLiquida = dict['margemliquida'];
        const divLiqPatrimonio = dict['dividaliquidapatrimonio'];
        const divLiqEbitda = dict['dividaliquidaebitda'];
        const liquidezCorrente = dict['liquidezcorrente'];
        const lpa = dict['lpa'];
        const vpa = dict['vpa'];
        const cagr5a = dict['cagrlucros5anos'];
        const giroAtivos = dict['giroativos'];

        let valorGrahamPadrao = null;
        let valorGrahamRev = null;
        if (lpa > 0) {
            if (vpa > 0) valorGrahamPadrao = Math.sqrt(22.5 * lpa * vpa);
            const SELIC_ATUAL = 10.75;
            const TAXA_BASE_GRAHAM = 4.4;
            const g = cagr5a ? (cagr5a / 100) : 0; 
            valorGrahamRev = (lpa * (8.5 + (2 * (g * 100))) * TAXA_BASE_GRAHAM) / SELIC_ATUAL;
        }

        let precoTeto6 = null;
        let precoTeto8 = null;
        if (dy > 0 && cotacao > 0) {
            const dividendoReais = (dy / 100) * cotacao;
            precoTeto6 = dividendoReais / 0.06; 
            precoTeto8 = dividendoReais / 0.08; 
        }

        res.json({
            ticker: ticker.toUpperCase(),
            perfilAtivo: userProfile,
            cotacao: { value: formatCurrency(cotacao), class: 'neutral' },
            pl: { value: formNum(pl), class: classifyAcao('pl', pl, userProfile) },
            pvp: { value: formNum(pvp), class: classifyAcao('pvp', pvp, userProfile) },
            dy: { value: formatPercent(dy), class: classifyAcao('dy', dy, userProfile) },
            roe: { value: formatPercent(roe), class: classifyAcao('roe', roe, userProfile) },
            margemLiquida: { value: formatPercent(margemLiquida), class: classifyAcao('margemLiquida', margemLiquida, userProfile) },
            divLiqPatrimonio: { value: formNum(divLiqPatrimonio), class: classifyAcao('divPatrimonio', divLiqPatrimonio, userProfile) },
            cagr5a: { value: formatPercent(cagr5a), class: classifyAcao('cagr5a', cagr5a, userProfile) }, 
            payout: { value: formatPercent(payout), class: classifyAcao('payout', payout, userProfile) },
            roic: { value: formatPercent(roic), class: classifyAcao('roic', roic, userProfile) },
            roa: { value: formatPercent(roa), class: classifyAcao('roa', roa, userProfile) },
            margemBruta: { value: formatPercent(margemBruta), class: classifyAcao('margemBruta', margemBruta, userProfile) },
            margemEbitda: { value: formatPercent(margemEbitda), class: classifyAcao('margemEbitda', margemEbitda, userProfile) },
            divLiqEbitda: { value: formNum(divLiqEbitda), class: classifyAcao('divLiqEbitda', divLiqEbitda, userProfile) },
            liquidezCorrente: { value: formNum(liquidezCorrente), class: classifyAcao('liquidezCorrente', liquidezCorrente, userProfile) },
            giroAtivos: { value: formNum(giroAtivos), class: classifyAcao('giroAtivos', giroAtivos, userProfile) },
            valorGrahamPadrao: { value: formatCurrency(valorGrahamPadrao), class: (valorGrahamPadrao && cotacao < valorGrahamPadrao) ? 'good' : 'bad' },
            valorGrahamRev: { value: formatCurrency(valorGrahamRev), class: (valorGrahamRev && cotacao < valorGrahamRev) ? 'good' : 'bad' },
            precoTeto6: { value: formatCurrency(precoTeto6), class: (precoTeto6 && cotacao < precoTeto6) ? 'good' : 'bad' },
            precoTeto8: { value: formatCurrency(precoTeto8), class: (precoTeto8 && cotacao < precoTeto8) ? 'good' : 'bad' },
            lpa: { value: formNum(lpa), class: 'neutral' },
            vpa: { value: formNum(vpa), class: 'neutral' }
        });

    } catch (error) {
        console.error("Erro Ações:", error.message);
        res.status(404).json({ error: 'Ativo não encontrado.' });
    }
});

app.post('/api/fiis', async (req, res) => {
    const { ticker, profile } = req.body;
    if (!ticker) return res.status(400).json({ error: 'Ticker não informado' });
    const userProfile = profile || 'moderado';

    try {
        const { data } = await axios.get(`https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`, axiosConfig);
        const $ = cheerio.load(data);
        
        const dictNum = {}; 
        const dictRaw = {}; 

        function addData(title, value) {
            if (!title || !value) return;
            const key = normalizeKey(title);
            const cleanValue = value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            dictNum[key] = parseForMath(cleanValue);
            dictRaw[key] = cleanValue;
        }

        const cotacaoStr = $('.value').first().text().trim();
        dictNum['cotacao'] = parseForMath(cotacaoStr);
        dictRaw['cotacao'] = cotacaoStr;

        $('._card').each((_, el) => {
            const spanHeader = $(el).find('._card-header span');
            const title = spanHeader.attr('title') || spanHeader.text().trim();
            let value = $(el).find('._card-body > div > span').first().text().trim();
            if (!value) value = $(el).find('._card-body .value').text().trim();
            if (!value) value = $(el).find('._card-body > span').first().text().trim();
            if (!value) value = $(el).find('._card-body').text().trim();
            addData(title, value);
        });

        $('.cell').each((_, el) => {
            const title = $(el).find('.name').text().trim() || $(el).find('.title').text().trim();
            const value = $(el).find('.value').text().trim();
            addData(title, value);
        });

        const cotacao = dictNum['cotacao'];
        const ultimoRendimento = dictNum['ultimorendimento'];
        
        const pvpMath = dictNum['pvp'];
        const dyMath = dictNum['dividendyield'] || dictNum['dy12m'] || dictNum['dy'];
        const liquidezDiariaMath = dictNum['liquidezdiaria'];
        const valorPatrimonialMath = dictNum['valorpatrimonial'];
        const vacanciaMath = dictNum['vacancia'];
        const numeroCotistasMath = dictNum['numerodecotistas'];
        const taxaAdministracaoMath = dictNum['taxadeadministracao'];
        const variacao12mMath = dictNum['variacao12m'];

        let ebn = '-';
        let vn = '-';
        if (cotacao > 0 && ultimoRendimento > 0) {
            const ebnCalc = Math.ceil(cotacao / ultimoRendimento);
            ebn = String(ebnCalc);
            vn = formatCurrency(ebnCalc * cotacao);
        }

        res.json({
            ticker: ticker.toUpperCase(),
            perfilAtivo: userProfile,
            cotacao: { value: dictRaw['cotacao'] || formatCurrency(cotacao), class: 'neutral' },
            pvp: { value: dictRaw['pvp'] || formNum(pvpMath), class: classifyFii('pvp', pvpMath, userProfile) },
            dy: { value: dictRaw['dividendyield'] || dictRaw['dy12m'] || formatPercent(dyMath), class: classifyFii('dy', dyMath, userProfile) },
            liquidezDiaria: { value: dictRaw['liquidezdiaria'] || '-', class: classifyFii('liquidezDiaria', liquidezDiariaMath, userProfile) },
            valorPatrimonial: { value: dictRaw['valorpatrimonial'] || '-', class: classifyFii('valorPatrimonial', valorPatrimonialMath, userProfile) },
            vacancia: { value: dictRaw['vacancia'] || '-', class: classifyFii('vacancia', vacanciaMath, userProfile) },
            numeroCotistas: { value: dictRaw['numerodecotistas'] || '-', class: classifyFii('numeroCotistas', numeroCotistasMath, userProfile) },
            taxaAdministracao: { value: dictRaw['taxadeadministracao'] || '-', class: classifyFii('taxaAdministracao', taxaAdministracaoMath, userProfile) },
            variacao12m: { value: dictRaw['variacao12m'] || '-', class: classifyFii('variacao12m', variacao12mMath, userProfile) },
            ebn: { value: ebn, class: 'good' }, 
            vn: { value: vn, class: 'neutral' },
            ultimoRendimento: { value: dictRaw['ultimorendimento'] || '-', class: 'neutral' },
            vpa: { value: dictRaw['valpatrimonialpcota'] || dictRaw['valorpatrimonialpcota'] || '-', class: 'neutral' },
            segmento: { value: dictRaw['segmento'] || '-', class: 'neutral' },
            mandato: { value: dictRaw['mandato'] || '-', class: 'neutral' },
            tipoFundo: { value: dictRaw['tipodefundo'] || '-', class: 'neutral' },
            tipoGestao: { value: dictRaw['tipodegestao'] || '-', class: 'neutral' }
        });

    } catch (error) {
        console.error("Erro FIIs:", error.message);
        res.status(404).json({ error: 'Fundo não encontrado.' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});