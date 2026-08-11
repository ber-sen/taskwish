import { Actor } from "taskwish";
import { Greeter } from "../greeter";

export const { biller } = Actor("Biller").use(Greeter);
