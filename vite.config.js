import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/SIP-Monitor/",
  server: {
    proxy: {
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
      },
      "/api/nse": {
        target: "https://nsearchives.nseindia.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nse/, ""),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
          Accept: "text/csv,text/plain,*/*",
          Referer: "https://www.nseindia.com/",
        },
      },
      "/api/amfi": {
        target: "https://portal.amfiindia.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/amfi/, ""),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
          Accept: "text/plain,*/*",
        },
      },
    },
  },
  preview: {
    proxy: {
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
      },
      "/api/nse": {
        target: "https://nsearchives.nseindia.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nse/, ""),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
          Accept: "text/csv,text/plain,*/*",
          Referer: "https://www.nseindia.com/",
        },
      },
      "/api/amfi": {
        target: "https://portal.amfiindia.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/amfi/, ""),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
          Accept: "text/plain,*/*",
        },
      },
    },
  },
});
