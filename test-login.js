const login = async () => {
    const res = await fetch('https://movilizacion-hcu.vercel.app/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@hospital.cl', password: 'admin123' })
    });
    console.log(res.status);
    console.log(await res.text());
};
login();
