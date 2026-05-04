import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/*.css"],
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },
  // @imgly/background-removal pulls in onnxruntime-web with a webgpu
  // sub-export that Rollup can't statically resolve. The package is
  // designed to be loaded dynamically at runtime (it picks the best
  // ONNX backend per browser), so excluding it from prebundle + treating
  // its ONNX deps as externals during SSR is the supported workaround.
  optimizeDeps: {
    exclude: ["@imgly/background-removal", "onnxruntime-web"],
  },
  ssr: {
    noExternal: [],
    external: ["@imgly/background-removal", "onnxruntime-web"],
  },
  build: {
    rollupOptions: {
      external: (id) =>
        id === "onnxruntime-web/webgpu" ||
        id === "onnxruntime-web/wasm" ||
        id === "onnxruntime-web",
    },
  },
});
