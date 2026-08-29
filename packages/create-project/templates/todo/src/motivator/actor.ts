import { Actor } from "taskwish";

import { Todos } from "../todos";

const { actor: createActor } = Actor("Motivator");

export const actor = () => createActor().use(Todos);
