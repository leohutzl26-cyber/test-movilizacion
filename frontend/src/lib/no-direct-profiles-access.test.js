// Guardia: el navegador no debe leer ni escribir la tabla "profiles". La anon key viaja en el
// bundle, así que cualquier acceso directo expone datos personales (o, con RLS cerrado, falla en
// silencio). Todo acceso debe pasar por el backend: /api/profiles y /api/admin-users.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const TABLAS_PROTEGIDAS = ['profiles', 'audit_logs'];

const archivosFuente = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return archivosFuente(ruta);
    return /\.(js|jsx)$/.test(entrada.name) && !/\.test\.js$/.test(entrada.name) ? [ruta] : [];
  });

describe('acceso directo a tablas protegidas desde el navegador', () => {
  it.each(TABLAS_PROTEGIDAS)('ningún archivo usa supabase.from(\'%s\')', (tabla) => {
    const patron = new RegExp(`\\.from\\(\\s*['"\`]${tabla}['"\`]\\s*\\)`);
    const infractores = archivosFuente(RAIZ)
      .filter((archivo) => patron.test(fs.readFileSync(archivo, 'utf8')))
      .map((archivo) => path.relative(RAIZ, archivo));

    expect(infractores).toEqual([]);
  });

  it('no hay suscripciones Realtime sobre tablas protegidas', () => {
    const infractores = archivosFuente(RAIZ)
      .filter((archivo) => /\.channel\(|postgres_changes/.test(fs.readFileSync(archivo, 'utf8')))
      .map((archivo) => path.relative(RAIZ, archivo));

    expect(infractores).toEqual([]);
  });
});
