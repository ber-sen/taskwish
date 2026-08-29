import { Actor } from "taskwish";

import { Customers } from "../customers";
import { Tickets } from "../tickets";

export const { actor } = Actor("Support").use(Customers).use(Tickets);
