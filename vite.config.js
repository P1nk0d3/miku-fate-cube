import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/miku-fate-cube/",
  build: {
    outDir: "dist",
  },
});
