 

function ensure(name: string, value: string) {
  if (!process.env[name]) {
    process.env[name] = value;
  }
}

const fallbackDb = 'postgresql://postgres:postgres_password@127.0.0.1:5432/slabhub_test?schema=public';

ensure('NODE_ENV', 'test');
ensure('PORT', '3001');
ensure('DATABASE_URL_TEST', fallbackDb);
ensure('DATABASE_URL', process.env.DATABASE_URL_TEST || fallbackDb);
ensure('WEB_ORIGIN', 'http://localhost:3000');
ensure('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
ensure('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000');

ensure('SESSION_COOKIE_NAME', 'slabhub_session');
ensure('SESSION_TTL_DAYS', '30');
ensure('OTP_TTL_MINUTES', '10');
ensure('OTP_SECRET', 'test-secret');

ensure('JUSTTCG_BASE_URL', 'https://api.justtcg.com');
ensure('JUSTTCG_API_KEY', 'test-key-1,test-key-2');
ensure('PSA_API_TOKEN', 'test-psa-token');

ensure('S3_ENDPOINT', 'https://nyc3.digitaloceanspaces.com');
ensure('S3_REGION', 'nyc3');
ensure('S3_BUCKET', 'test-bucket');
ensure('S3_ACCESS_KEY_ID', 'test-access-key');
ensure('S3_SECRET_ACCESS_KEY', 'test-secret-key');
ensure('S3_PUBLIC_BASE_URL', 'https://test-bucket.nyc3.digitaloceanspaces.com');
ensure('S3_CDN_BASE_URL', 'https://test-bucket.nyc3.cdn.digitaloceanspaces.com');
ensure('S3_FORCE_PATH_STYLE', 'false');
ensure('S3_UPLOAD_MAX_BYTES', '15728640');
ensure('S3_ALLOWED_MIME', 'image/jpeg,image/png,image/webp');

ensure('FACEBOOK_APP_ID', 'fb-app-id');
ensure('FACEBOOK_APP_SECRET', 'fb-app-secret');
ensure('INVITE_ONLY_REGISTRATION', 'false');

ensure('BRIGHTDATA_CUSTOMER_ID', '');
ensure('BRIGHTDATA_ZONE', '');
ensure('BRIGHTDATA_TOKEN', '');

ensure('GEMINI_API_KEY', '');
ensure('RESEND_API_KEY', '');
ensure('MAIL_FROM', 'SlabHub <auth@slabhub.gg>');
ensure('SENTRY_DSN', '');
