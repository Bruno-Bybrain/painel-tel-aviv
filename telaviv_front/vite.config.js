import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@alert": path.resolve(__dirname, "src/Components/Alert/Alert.jsx"),
      "@urlAtual": path.resolve(__dirname, "src/Components/Url/urlAtual.jsx"),
    },
  },
 /* server: {
    host: "telaviv", // <- essa linha é a chave
    port: 5174,
  },*/
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
