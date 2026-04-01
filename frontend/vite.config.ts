import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Do not proxy /auth/callback — that is a React route; /auth/* otherwise goes to the API.
      "/auth": {
        target: "http://localhost:4000",
        changeOrigin: true,
        bypass(req) {
          const u = req.url?.split("?")[0] ?? "";
          if (u === "/auth/callback" || u.startsWith("/auth/callback/")) {
            return "/index.html";
          }
        },
      },
      "/translate": { target: "http://localhost:4000", changeOrigin: true },
      "/versions": { target: "http://localhost:4000", changeOrigin: true },
      "/scores": { target: "http://localhost:4000", changeOrigin: true },
      "/reputation": { target: "http://localhost:4000", changeOrigin: true },
      "/glossary": { target: "http://localhost:4000", changeOrigin: true },
      "/tasks": { target: "http://localhost:4000", changeOrigin: true },
      "/developer": { target: "http://localhost:4000", changeOrigin: true },
      "/documents": { target: "http://localhost:4000", changeOrigin: true },
      "/admin": { target: "http://localhost:4000", changeOrigin: true },
      "/billing": { target: "http://localhost:4000", changeOrigin: true },
      "/health": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
