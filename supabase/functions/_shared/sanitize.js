// Quita los campos secretos de una fila de "profiles" antes de guardarla en audit_logs
// (tabla legible con la anon key) o de devolverla al navegador.
const sinSecretos = (fila) => {
  if (!fila || typeof fila !== 'object') return fila;
  const { encrypted_password, ...resto } = fila;
  return resto;
};

module.exports = { sinSecretos };
