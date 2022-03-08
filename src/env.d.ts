declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      REDIS_URL: string;
      PORT: string;
      SESSION_SECRET: string;
      CORS_ORIGIN: string;
      NODEMAILER_USER: string;
      NODEMAILER_PASSWORD: string;
    }
  }
}

export {}
