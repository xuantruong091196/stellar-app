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
  // @imgly/background-removal dynamically imports onnxruntime-web (and
  // its webgpu sub-export) at runtime to pick the best ONNX backend
  // per browser. We exclude both from prebundle so Vite leaves the
  // dynamic imports intact instead of trying to statically resolve
  // every conditional path. ssr.noExternal forces them to be bundled
  // for the SSR build (Remix loaders) — they shouldn't actually run
  // server-side, but Remix needs the modules to be resolvable to type
  // the dynamic import call.
  optimizeDeps: {
    exclude: ["@imgly/background-removal", "onnxruntime-web"],
  },
  ssr: {
    noExternal: ["@imgly/background-removal", "onnxruntime-web"],
  },
});
