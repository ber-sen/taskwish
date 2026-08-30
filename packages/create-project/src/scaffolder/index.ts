import { actor } from "./actor";
import { createProject } from "./create-project";

export {
  createProject,
  TEMPLATE_NAMES,
  type CreateProjectOptions,
  type CreateProjectResult,
  type TemplateName,
} from "./create-project";

export const { Scaffolder } = actor().service({ createProject });
