import * as Sentry from '@sentry/node';
import { config } from 'dotenv';
config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  spotlight: process.env.NODE_ENV === 'development'
});

export default Sentry;