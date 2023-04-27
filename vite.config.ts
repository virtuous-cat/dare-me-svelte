import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";
import { webSocketServer } from "./websocketserver/wssdev";

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [sveltekit(), webSocketServer],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
