// noinspection JSUnusedGlobalSymbols

import * as Vite from "vite";
import checker from "vite-plugin-checker";
import {viteStaticCopy} from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";

import json5 from 'json5';
import fs from "fs-extra";
import path from "path";

export default Vite.defineConfig(
  async ({command, mode}): Promise<Vite.UserConfig> => {
    const packageJson = json5.parse(await fs.promises.readFile('package.json5', 'utf8'))

    return {
      root: command === "serve" ? "." : "src/",
      base: "/modules/compendium-search/",
      publicDir: path.resolve(__dirname, "public"),
      server: {
        port: 30001,
        proxy: {
          "^(?!/modules/compendium-search)": "http://localhost:30000",
          "/socket.io": {
            target: "ws://localhost:30000",
            ws: true,
          },
        },
        preTransformRequests: true,
      },
      build: {
        outDir: path.resolve(__dirname, "dist"),
        emptyOutDir: true,
        minify: false,
        sourcemap: true,
        rollupOptions: {
          output: {
            entryFileNames: "index.mjs",
            chunkFileNames: "[name].mjs",
            manualChunks: {
              vendor:
                mode === "production"
                  ? Object.keys(packageJson.dependencies)
                  : [],
            },
            sourcemapPathTransform: name => name.slice(1),
            assetFileNames: (chunkInfo) => {
              if (chunkInfo.name == "style.css") {
                return "styles/compendium-search.css";
              }
              return chunkInfo.name!;
            },
          },
        },
        lib: {
          entry: "index.ts",
          formats: ["es"],
          fileName: "index",
        },
        target: "es2022",
      },
      esbuild: {
        keepNames: true,
      },
      optimizeDeps: {
        include: [...Object.keys(packageJson.dependencies), "../node_modules/flexsearch/dist/module/document"],
      },
      plugins: [
        checker({
          typescript: true,
        }),
        tsconfigPaths(),
        viteStaticCopy({
          targets: [
            {src: path.resolve(__dirname, "license.txt"), dest: "."},
            {src: path.resolve(__dirname, "readme.md"), dest: "."},
          ]
        }),
        viteStaticCopy({
          structured: true,
          targets: [
            {src: path.resolve(__dirname, "src/**/*.ts"), dest: "./src/"},
          ],
        }),
        // Vite HMR is only preconfigured for css files: add handler for HBS templates
        {
          name: "hmr-handler",
          apply: "serve",
          handleHotUpdate(context) {
            if (context.file.startsWith("dist")) {
              return;
            }

            if (context.file.endsWith("en.json")) {
              const basePath = context.file.slice(context.file.indexOf("lang/"));
              console.log(`Updating lang file at ${basePath}`);
              fs.promises.copyFile(context.file, `dist/${basePath}`).then(() => {
                context.server.ws.send({
                  type: "custom",
                  event: "lang-update",
                  data: { path: `modules/compendium-search/${basePath}` },
                });
              });
            } else if (context.file.endsWith(".hbs")) {
              const basePath = context.file.slice(context.file.indexOf("template/"));
              console.log(`Updating template file at ${basePath}`);
              fs.promises.copyFile(context.file, `dist/${basePath}`).then(() => {
                context.server.ws.send({
                  type: "custom",
                  event: "template-update",
                  data: { path: `modules/compendium-search/${basePath}` },
                });
              });
            }
          },
        },
      ],
    };
  }
);
