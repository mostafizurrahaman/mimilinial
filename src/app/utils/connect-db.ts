import { testDbConnection } from "@/app/db";

export const connectDB = async (_uri: string) => {
   await testDbConnection();
   console.info("✅ Neon DB (Drizzle ORM) connected successfully!")
};
