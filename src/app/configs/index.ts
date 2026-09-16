import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// 1. Load the correct .env file
const nodeEnv = process.env.NODE_ENV || "development";
dotenv.config({
  path: path.join(process.cwd(), `.env.${nodeEnv}`),
});

// 2. Define the Schema (The Validator)
const envSchema = z.object({
  NODE_ENV: z
    .enum(["production", "development", "local"])
    .default("development"),
  PORT: z.string(),
  CORS_ORIGINS: z.string().default("*"),

  // Database:
  DATABASE_URL: z.string().url("Invalid Database URL"),
  PASSWORD_SALT_ROUND: z.string().transform(Number).default(12),

  // Site Config
  SITE_NAME: z.string(),
  SITE_LOGO: z.string().url().optional(),
  SITE_PRIMARY_COLOR: z.string().default("#000000"),

  // Node Mailer
  NODE_APP_PASSWORD: z.string(),
  NODE_APP_EMAIL: z.string(),
  NODE_EMAIL_HOST: z.string(),
  NODE_EMAIL_PORT: z.string().transform((val) => Number(val)),
  NODE_EMAIL_REPLY_TO: z.string(),

  // JWT
  ACCESS_TOKEN_SECRET: z.string().min(10),
  ACCESS_TOKEN_EXPIRES: z.string(),
  REFRESH_TOKEN_SECRET: z.string().min(10),
  REFRESH_TOKEN_EXPIRES: z.string(),
  RESET_TOKEN_SECRET: z.string().min(10),
  RESET_TOKEN_EXPIRES: z.string(),

  // AWS
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),

  // Admin & OTP
  SUPER_ADMIN_PASSWORD: z.string(),
  SUPER_ADMIN_EMAIL: z.string().email(),

  OTP_EXPIRES_IN: z.string().transform(Number).default(5),
  OTP_DIGITS: z.string().transform(Number).default(6),
  OTP_RESEND_WINDOW_SECOND: z.string().transform(Number).default(60),

  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_API_KEY: z.string(),
});

// 3. Validate process.env
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid Environment Variables:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1); // Stop the app immediately if variables are wrong
}

const env = parsedEnv.data;

// 4. Export the Structured Object
export const configs = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  corsOrigins: env.CORS_ORIGINS,
  databaseUrl: env.DATABASE_URL,
  passwordSaltRound: env.PASSWORD_SALT_ROUND,

  site: {
    name: env.SITE_NAME,
    logo: env.SITE_LOGO,
    primaryColor: env.SITE_PRIMARY_COLOR,
    secondaryColor: env.SITE_PRIMARY_COLOR,
    accentColor: env.SITE_PRIMARY_COLOR,
  },

  nodeMailer: {
    password: env.NODE_APP_PASSWORD,
    email: env.NODE_APP_EMAIL,
    port: env.NODE_EMAIL_PORT,
    host: env.NODE_EMAIL_HOST,
    replyTo: env.NODE_EMAIL_REPLY_TO,
  },

  jwt: {
    accessToken: {
      secret: env.ACCESS_TOKEN_SECRET,
      expiresIn: env.ACCESS_TOKEN_EXPIRES,
    },
    refreshToken: {
      secret: env.REFRESH_TOKEN_SECRET,
      expiresIn: env.REFRESH_TOKEN_EXPIRES,
    },
    resetToken: {
      secret: env.RESET_TOKEN_SECRET,
      expiresIn: env.RESET_TOKEN_EXPIRES,
    },
  },

  awsConfig: {
    accessKeyID: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    bucketName: env.AWS_S3_BUCKET_NAME,
  },

  superAdmin: {
    password: env.SUPER_ADMIN_PASSWORD,
    email: env.SUPER_ADMIN_EMAIL,
  },

  otpSettings: {
    expiresIn: env.OTP_EXPIRES_IN,
    digits: env.OTP_DIGITS,
    resendWindowInSeconds: env.OTP_RESEND_WINDOW_SECOND,
  },

  cloudinary: {
    cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiSecret: env.CLOUDINARY_API_SECRET,
    cloudinaryApiKey: env.CLOUDINARY_API_KEY,
  },
} as const;

// Automatically infer the type for use elsewhere if needed
export type TConfigs = typeof configs;
