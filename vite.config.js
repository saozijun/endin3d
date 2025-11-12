import { fileURLToPath, URL } from "node:url";
import { viteMockServe } from "vite-plugin-mock";

import { defineConfig } from "vite";

import vue from "@vitejs/plugin-vue";
import ElementPlus from "unplugin-element-plus/vite";
import "element-plus/es/hooks/use-locale/index";

export default defineConfig((configEnv) => {
  const newV = Math.floor(Math.random() * 1000);
  return {
    plugins: [
      vue(),
      ElementPlus({
        defaultLocale: "zh-cn",
      }),
      viteMockServe({
        mockPath: "./src/mockServer",
        enable: false,
        watchFiles: true,
      }),
    ],
    base: "./",
    define: {
      __APP_VERSION__: newV,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
