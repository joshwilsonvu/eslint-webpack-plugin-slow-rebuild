const ESLintPlugin = require("eslint-webpack-plugin");
const path = require("path");
const debug = require("debug")("slow-rebuild");

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "development",
  entry: path.resolve("index.js"),
  plugins: [
    {
      // Simulate eslint-webpack-plugin's logic for choosing which files to pass to `ESLint.lintFiles()`
      // Just for debugging, no actual impact on results
      apply(compiler) {
        compiler.hooks.compilation.tap("slow-rebuild", (compilation) => {
          const files = new Set();
          function addFile(m) {
            const file = m.resource.split("?")[0];
            if (!file.includes("node_modules")) {
              files.add(file);
            }
          }

          // This adds files that were actually built in the current compilation
          compilation.hooks.succeedModule.tap("slow-rebuild", addFile);

          // !!! This adds files that didn't need to be rebuilt, expecting ESLint to have
          // cache entries, but on a cold built the cache is empty and all files are linted,
          // even with `lintDirtyModulesOnly: true`!
          // Uncomment this line here and in node_modules/eslint-webpack-plugin/dist/index.js:120
          // for proper behavior.
          compilation.hooks.stillValidModule.tap("slow-rebuild", addFile);

          compilation.hooks.finishModules.tap("slow-rebuild", () => {
            debug("Files to be linted: %O", Array.from(files));
          });
        });
      },
    },
    new ESLintPlugin({
      lintDirtyModulesOnly: true,
      cache: true,
      cacheLocation: path.resolve("node_modules", ".cache", "eslint.json"),
    }),
  ],
  // no filesystem cache
};
