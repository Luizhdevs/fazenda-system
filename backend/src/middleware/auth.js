const jwt = require('jsonwebtoken');

// Valida o JWT e popula req.usuario
function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não informado' });
  }
  const token = header.slice(7);
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Valida o JWT E exige que uma fazenda tenha sido selecionada
function autenticarComFazenda(req, res, next) {
  autenticar(req, res, () => {
    if (!req.usuario.fazenda_id) {
      return res.status(403).json({ error: 'Selecione uma fazenda antes de continuar' });
    }
    next();
  });
}

module.exports = autenticar;
module.exports.comFazenda = autenticarComFazenda;
