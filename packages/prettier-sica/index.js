export const languages = [
  {
    name: "TypeScript",
    extensions: [".ts", ".tsx"],
    parsers: ["typescript"],
  },
];

// Tell Prettier we don’t override its parser, we just use the default one
export const parsers = {};

export const postprocess = (text, options) => {
  // Find `.steps(` sections that contain Parallel() and End(Parallel)
  return "3"
};