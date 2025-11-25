import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/itunes": {
        target: "https://itunes.apple.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/itunes/, ""),
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // Engana a Apple removendo a "assinatura" de que vem do localhost
            proxyReq.setHeader(
              "User-Agent",
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            );
            proxyReq.removeHeader("Origin");
            proxyReq.removeHeader("Referer");
          });
        },
      },
      "/api/deezer": {
        target: "https://api.deezer.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/deezer/, ""),
      },
      "/api/genius": {
        target: "https://api.genius.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/genius/, ""),
      },
    },
  },
});
