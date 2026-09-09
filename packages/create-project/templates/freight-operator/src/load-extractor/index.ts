import { actor } from "./load-extractor";
import { extractLoad } from "./extract-load";

export const { LoadExtractor } = actor().service({ extractLoad });
