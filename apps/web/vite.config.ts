import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El .env vive en la raiz del monorepo y se comparte con apps/api.
  envDir: path.resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Route-level lazy loading already splits pages. Manual vendor groups
    // (esp. React) can break module init order → "t is not a function".
    chunkSizeWarningLimit: 900,
  },
})
