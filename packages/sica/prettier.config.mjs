import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [path.join(__dirname, "../../packages/prettier-taskwish/index.js")],
};