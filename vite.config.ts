import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/AlchemiX---Data-Analysis-Frontend/",
  server: {
    port: 5173,
    strictPort: true,
  },
});

