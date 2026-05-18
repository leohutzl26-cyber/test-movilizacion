const bcrypt = require('bcrypt');
const hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK';
const passwords = ['admin', '12345', '1234', 'test', 'Test1234', 'Admin123!', '123'];

passwords.forEach(async p => {
    const match = await bcrypt.compare(p, hash);
    if (match) console.log('Match found:', p);
});
