/**
 * Cria as coleções (tabelas NoSQL) do sistema no banco MongoDB existente.
 * Baseado no diagrama NoAM (diagrama.puml).
 *
 * Uso:
 *   npm run db:init
 *   node scripts/init-collections.js
 *
 * Requer MONGO_URI no .env apontando para o banco já existente.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const COLLECTIONS = [
    {
        name: 'usuarios',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['email', 'senhaHash', 'dataCadastro'],
                properties: {
                    email: { bsonType: 'string' },
                    senhaHash: { bsonType: 'string' },
                    perfilInvestidor: { bsonType: 'string' },
                    dataCadastro: { bsonType: 'date' },
                },
            },
        },
        indexes: [{ key: { email: 1 }, unique: true, name: 'email_unique' }],
    },
    {
        name: 'setores_ativos',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['nomeSetor'],
                properties: {
                    nomeSetor: { bsonType: 'string' },
                    descricao: { bsonType: 'string' },
                },
            },
        },
        indexes: [{ key: { nomeSetor: 1 }, unique: true, name: 'nomeSetor_unique' }],
    },
    {
        name: 'ativos_financeiros',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['ticker', 'tipoAtivo', 'cotacaoAtual', 'ultimaAtualizacao'],
                properties: {
                    ticker: { bsonType: 'string' },
                    tipoAtivo: { bsonType: 'string' },
                    cotacaoAtual: { bsonType: ['double', 'int', 'long', 'decimal'] },
                    ultimaAtualizacao: { bsonType: 'date' },
                    setorAtivoId: { bsonType: 'objectId' },
                },
            },
        },
        indexes: [
            { key: { ticker: 1 }, unique: true, name: 'ticker_unique' },
            { key: { setorAtivoId: 1 }, name: 'setorAtivoId_idx' },
        ],
    },
    {
        name: 'historicos_busca',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['usuarioId', 'dataHoraBusca', 'tickerBuscado', 'sucesso'],
                properties: {
                    usuarioId: { bsonType: 'objectId' },
                    dataHoraBusca: { bsonType: 'date' },
                    tickerBuscado: { bsonType: 'string' },
                    sucesso: { bsonType: 'bool' },
                    ativoFinanceiroId: { bsonType: 'objectId' },
                },
            },
        },
        indexes: [
            { key: { usuarioId: 1, dataHoraBusca: -1 }, name: 'usuario_data_idx' },
            { key: { ativoFinanceiroId: 1 }, name: 'ativoFinanceiroId_idx' },
            { key: { tickerBuscado: 1 }, name: 'tickerBuscado_idx' },
        ],
    },
    {
        name: 'analises_fundamentalistas',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['historicoBuscaId', 'perfilUtilizado'],
                properties: {
                    historicoBuscaId: { bsonType: 'objectId' },
                    perfilUtilizado: { bsonType: 'string' },
                    precoJustoGraham: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
                    precoTetoBazin: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
                    dividendYield: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
                    pvp: { bsonType: ['double', 'int', 'long', 'decimal', 'null'] },
                    classificacaoGeral: { bsonType: ['string', 'null'] },
                },
            },
        },
        indexes: [
            { key: { historicoBuscaId: 1 }, unique: true, name: 'historicoBuscaId_unique' },
        ],
    },
];

async function ensureCollection(db, { name, validator }) {
    const exists = await db.listCollections({ name }).hasNext();
    if (exists) {
        console.log(`  • ${name} — já existe`);
        return false;
    }

    await db.createCollection(name, { validator });
    console.log(`  • ${name} — criada`);
    return true;
}

async function ensureIndexes(db, { name, indexes }) {
    if (!indexes?.length) return;

    const collection = db.collection(name);
    for (const index of indexes) {
        const { key, ...options } = index;
        await collection.createIndex(key, options);
        console.log(`    ↳ índice ${options.name || JSON.stringify(key)}`);
    }
}

async function initCollections() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error('❌ MONGO_URI não definida no .env');
        process.exit(1);
    }

    console.log('\n🔌 Conectando ao banco existente...\n');
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;
    console.log(`📦 Banco: ${db.databaseName}\n`);
    console.log('Criando coleções do diagrama NoAM:\n');

    let created = 0;

    for (const spec of COLLECTIONS) {
        const isNew = await ensureCollection(db, spec);
        if (isNew) created++;
        await ensureIndexes(db, spec);
    }

    const all = await db.listCollections().toArray();

    console.log(`\n✅ Concluído — ${created} coleção(ões) nova(s).\n`);
    console.log('Coleções no banco:');
    for (const { name } of all.sort((a, b) => a.name.localeCompare(b.name))) {
        const marker = COLLECTIONS.some((c) => c.name === name) ? '✓' : ' ';
        console.log(`  [${marker}] ${name}`);
    }
    console.log('');
}

initCollections()
    .then(() => mongoose.disconnect())
    .catch((err) => {
        console.error('\n❌ Erro:', err.message);
        mongoose.disconnect().finally(() => process.exit(1));
    });
