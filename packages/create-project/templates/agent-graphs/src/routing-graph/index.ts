import { routeRequest } from "./route-request";
import { actor } from "./routing-graph";

export const { RoutingGraph } = actor().service({ routeRequest });
