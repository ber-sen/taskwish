import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  entries: ["src/index"],
  declaration: true,
  clean: true,
  externals: ["@ark/util", "@ark/schema", "arkregex"],
  rollup: {
    emitCJS: true
  }
})
