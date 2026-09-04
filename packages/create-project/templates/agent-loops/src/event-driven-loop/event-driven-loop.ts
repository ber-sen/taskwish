import { Actor } from "taskwish";

import { GitHub } from "../github";

const { actor: createActor } = Actor("EventDrivenLoop");

export const actor = () => createActor().use(GitHub);
