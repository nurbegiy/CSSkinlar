import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Telegram Mini App'ni lokal tarmoqda/tunnelda sinash uchun
  },
});
