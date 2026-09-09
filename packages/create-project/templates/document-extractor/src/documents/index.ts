import { actor } from "./documents";
import { readDocuments } from "./read-documents";

export const { Documents } = actor().service({ readDocuments });
