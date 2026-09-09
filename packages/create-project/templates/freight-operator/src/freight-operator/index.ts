import { actor } from "./freight-operator";
import { listLoads } from "./list-loads";
import { receiveLoad } from "./receive-load";
import { refreshOrder } from "./refresh-order";
import { reviewLoad } from "./review-load";
import { reviseLoad } from "./revise-load";

export const { FreightOperator } = actor().service({
  receiveLoad,
  listLoads,
  reviseLoad,
  reviewLoad,
  refreshOrder,
});
