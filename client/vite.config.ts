import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  plugins: [solid(), ...(mode === "development" ? [basicSsl()] : [])],
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
    https: mode === "development",
    host: true,
  },
  build: {
    outDir: "dist",
  },
  base: mode === "production" ? "/" : "/",
}));
