import { actor } from "./actor";
import { listEntries } from "./list-entries";
import { record } from "./record";

export const { ActivityLog } = actor().service({ record, listEntries });
