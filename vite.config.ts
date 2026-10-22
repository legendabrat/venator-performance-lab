import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  base: process.env.BASE_PATH || "./",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "offline-shell",
      closeBundle() {
        const assets = readdirSync("dist/assets").map(
          (name) => "./assets/" + name,
        );
        const hash = createHash("sha256")
          .update(assets.join(","))
          .digest("hex")
          .slice(0, 12);
        const sw = readFileSync("dist/sw.js", "utf8")
          .replace("venator-shell-v1", "venator-shell-" + hash)
          .replace(
            "/* BUILD_ASSETS */",
            assets.map((x) => JSON.stringify(x)).join(","),
          );
        writeFileSync("dist/sw.js", sw);
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { charts: ["recharts"], icons: ["lucide-react"] },
      },
    },
  },
});
