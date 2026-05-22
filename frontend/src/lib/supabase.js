import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing in environment variables')
}

// Workaround a prueba de balas: Usamos XMLHttpRequest puro para esquivar 
// cualquier extensión o interceptor de fetch que esté bloqueando los streams.
export const customFetch = (url, options) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    
    // Evitar que el navegador cachee las peticiones GET de XMLHttpRequest
    if (!options.method || options.method.toUpperCase() === 'GET') {
      xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      xhr.setRequestHeader('Pragma', 'no-cache');
      xhr.setRequestHeader('Expires', '0');
    }

    xhr.onload = () => {
      let bodyText = xhr.responseText;
      
      // Si el status es de error, forzamos un JSON válido para que Supabase no explote
      if (xhr.status >= 400) {
        try {
          JSON.parse(bodyText);
        } catch (e) {
          bodyText = JSON.stringify({
            error: "server_error",
            message: `Error ${xhr.status}: El servidor rechazó la petición (posible email no confirmado o límite de intentos).`
          });
        }
      }

      resolve(new Response(bodyText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: {
          'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json'
        }
      }));
    };

    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.send(options.body || null);
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
})
