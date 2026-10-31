import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  // Without this Vite can bind to IPv6 only on Windows, and http://127.0.0.1:5173 refuses to connect.
  server: { host: "127.0.0.1", port: 5173 },
});
