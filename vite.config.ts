import { defineConfig } from "vite";

// Local builds: base "./" (simple `npm run dev` / `npm run preview`).
// GitHub Actions sets GITHUB_ACTIONS=true → correct path for Project Pages.
const base =
  process.env.GITHUB_ACTIONS === "true" ? "/ecpl-group-recon/" : "./";

export default defineConfig({
  base,
  server: {
    port: 5173,
  },
});
