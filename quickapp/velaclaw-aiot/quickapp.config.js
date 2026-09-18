/*
 * Project-level webpack overrides for the AIoT build.
 *
 * The toolkit merges `quickapp.config.js#webpack` into the configuration it
 * derives from the CLI/IDE flags, and then calls `postHook`. Both the command
 * line (`aiot build`) and the IDE run this same path, so this file is the only
 * place that can normalise the build regardless of who started it.
 *
 * Why it exists: the IDE builds with `--devtool inline-source-map`, which embeds
 * a base64 source map inside every page bundle. build/pages/clock/clock.js then
 * grows past the device's 1 MiB per-file install limit (1,049,781 bytes with the
 * map, 665 KiB without) and the package installs nowhere.
 *
 * The rule here is deliberately simple: page bundles never carry an inline
 * source map. `all` keeps bytecode builds identical, and an explicit
 * VELACLAW_ALLOW_INLINE_MAPS=1 is available for a local debugging session.
 */

const allowInlineMaps = process.env.VELACLAW_ALLOW_INLINE_MAPS === '1'

module.exports = {
  webpack: {
    devtool: allowInlineMaps ? 'inline-source-map' : false
  },
  postHook(config) {
    // `devtool` is applied by webpack itself; nothing else to rewrite. The hook
    // is kept so a future guard has a single, documented place to live.
    if (allowInlineMaps) return
    if (config.devtool) config.devtool = false
  }
}
