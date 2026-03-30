import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 80,
    proxy: {
      "/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
      "/swagger": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
    css: false,
    restoreMocks: true,
  },
});
