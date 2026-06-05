import jwt from 'jsonwebtoken';

export function createOptionalAuth(jwtSecret) {
    return function optionalAuth(req, res, next) {
        const header = req.headers.authorization;
        req.usuarioId = null;

        if (!header?.startsWith('Bearer ')) {
            return next();
        }

        try {
            const decoded = jwt.verify(header.slice(7), jwtSecret);
            req.usuarioId = decoded.id;
        } catch {
            req.usuarioId = null;
        }

        next();
    };
}

export function createRequireAuth(jwtSecret) {
    return function requireAuth(req, res, next) {
        const header = req.headers.authorization;

        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Autenticação necessária.' });
        }

        try {
            const decoded = jwt.verify(header.slice(7), jwtSecret);
            req.usuarioId = decoded.id;
            next();
        } catch {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }
    };
}
