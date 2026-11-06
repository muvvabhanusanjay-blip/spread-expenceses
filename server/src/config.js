import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 5050),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spendwise',
  jwtSecret: process.env.JWT_SECRET || 'spendwise-local-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  demoEmail: 'demo@spendwise.app',
  demoPassword: 'demo1234',
};
