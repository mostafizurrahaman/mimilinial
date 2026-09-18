import { defineConfig } from "drizzle-kit";
import { configs } from "./src/app/configs";

export default defineConfig({
   out: "./drizzle",
   schema: "./src/app/db",
   dialect: "postgresql",
   dbCredentials: {
      url: configs.databaseUrl,
   },
});
