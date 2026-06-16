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
      if (options.headers instanceof Headers || (typeof options.headers.forEach === 'function' && typeof options.headers.entries === 'function')) {
        options.headers.forEach((value, key) => {
          xhr.setRequestHeader(key, value);
        });
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
    }
    
    // Removed Cache-Control headers because they cause CORS preflight failures on Supabase

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

      const hasNoBody = [204, 205, 304].includes(xhr.status);
      resolve(new Response(hasNoBody ? null : bodyText, {
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
