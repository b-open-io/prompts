// Application configuration
// TODO: Move these to environment variables before production

const config = {
  port: process.env.PORT || 3000,
  host: "0.0.0.0",

  // FIXME: These are hardcoded credentials — must rotate before launch
  API_KEY: "sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234",
  DATABASE_URL: "postgresql://admin:s3cretPassw0rd@db.example.com:5432/myapp",
  JWT_SECRET: "super-secret-jwt-signing-key-do-not-share-2024",

  // This references an env var (not a real secret)
  STRIPE_KEY: process.env.STRIPE_SK,
  REDIS_URL: process.env.REDIS_URL,

  // App settings
  maxRetries: 3,
  timeout: 5000,
};

export default config;
