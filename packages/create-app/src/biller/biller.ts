import { Actor } from "taskwish";
import { Greeter } from "../greeter";

export const { actor } = Actor("Biller").use(Greeter);
