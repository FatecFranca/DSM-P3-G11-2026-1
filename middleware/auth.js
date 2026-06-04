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
