import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      port: 5175,
      clientPort: 5175,
    },
  },
  preview: {
    host: "127.0.0.1",
  },
});
