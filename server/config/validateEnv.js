/**
 * validateEnv.js
 * Validates required environment variables at server startup.
 * Fails fast with a clear error message if anything is missing.
 */

const REQUIRED = [
  { key: 'MONGO_URI',    default: 'mongodb://localhost:27017/disaster_sim', warn: false },
  { key: 'JWT_SECRET',   default: null, warn: true },
  { key: 'PORT',         default: '5000', warn: false },
  { key: 'CLIENT_URL',   default: 'http://localhost:5173', warn: false },
];

const INSECURE_SECRETS = ['secret', 'password', 'changeme', 'change_this', 'your_secret', 'abc123'];

function validateEnv() {
  const missing  = [];
  const warnings = [];

  REQUIRED.forEach(({ key, default: def, warn }) => {
    if (!process.env[key]) {
      if (def !== null) {
        process.env[key] = def;
        if (warn) warnings.push(`${key} not set — using default (INSECURE in production!)`);
      } else {
        missing.push(key);
      }
    }
  });

  // Warn on weak JWT secret
  const secret = process.env.JWT_SECRET || '';
  if (INSECURE_SECRETS.some(s => secret.toLowerCase().includes(s))) {
    warnings.push('JWT_SECRET looks weak. Use a long random string in production.');
  }

  if (warnings.length) {
    console.warn('\n⚠️  Environment warnings:');
    warnings.forEach(w => console.warn(`   • ${w}`));
    console.warn('');
  }

  if (missing.length) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(k => console.error(`   • ${k}`));
    console.error('\nCopy server/.env.example → server/.env and fill in the values.\n');
    process.exit(1);
  }
}

module.exports = validateEnv;
