const register = async () => {
    const res = await fetch('https://movilizacion-hcu.vercel.app/api/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin2@hospital.cl', password: 'admin123', name: 'Admin Dos', role: 'admin' })
    });
    console.log(res.status);
    console.log(await res.text());
};
register();
