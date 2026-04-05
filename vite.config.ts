import { defineConfig } from "vite";

// Use relative asset paths so GitHub Pages and file:// previews work without rewrites.
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
  },
});
