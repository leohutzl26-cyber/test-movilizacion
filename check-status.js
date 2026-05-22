// Application Status Checker
// Run this to check the current status of your application

const fs = require('fs');

console.log('🔍 Application Status Checker...');

// Check environment
const envChecks = {
    '.env.local': fs.existsSync('frontend/.env.local'),
    'node_modules': fs.existsSync('frontend/node_modules'),
    'package.json': fs.existsSync('frontend/package.json'),
    'schema.sql': fs.existsSync('supabase/schema.sql'),
    'test-data.sql': fs.existsSync('supabase/test-data.sql')
};

console.log('\n📁 File Status:');
Object.entries(envChecks).forEach(([file, exists]) => {
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Check if we can run the application
const canRun = envChecks['.env.local'] && envChecks['node_modules'];
console.log(`\n🚀 Can run application: ${canRun ? 'YES' : 'NO'}`);

// Check required environment variables
if (envChecks['.env.local']) {
    const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
    const hasUrl = envContent.includes('REACT_APP_SUPABASE_URL=');
    const hasKey = envContent.includes('REACT_APP_SUPABASE_ANON_KEY=');

    console.log('\n🔑 Environment Status:');
    console.log(`   Supabase URL: ${hasUrl ? '✅' : '❌'}`);
    console.log(`   Supabase Key: ${hasKey ? '✅' : '❌'}`);
}

console.log('\n📋 Next Steps:');
if (!canRun) {
    console.log('1. Create .env.local with your Supabase credentials');
    console.log('2. Run: cd frontend && npm install');
} else {
    console.log('1. Run: cd frontend && npm start');
    console.log('2. Open http://localhost:3000');
    console.log('3. Test with admin@hospital.cl / admin123');
}
