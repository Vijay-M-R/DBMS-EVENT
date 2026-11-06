import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    NAME: process.env.DB_NAME || 'freelance_marketplace',
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || '',
    POOL_MAX: parseInt(process.env.DB_POOL_MAX || '20', 10),
    IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },

  AUTH: {
    JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_change_me_in_production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || '*',
  },
};
