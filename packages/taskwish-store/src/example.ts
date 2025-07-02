import { desc, eq } from "drizzle-orm";
import { getQueryInfo } from "./helpers";
import * as schema from "./schema";
import { taskWishPackages } from "./schema";
import { Store } from ".";
import { useLoadQuery } from "./hooks";

const { store, setData } = Store({ schema });

const packageMap = new Map<
  string,
  {
    name: string;
    description: string;
    main: string;
    created_at: string;
    updated_at: string | null;
  }
>();

packageMap.set("pkg1", {
  name: "Automation Pro",
  description: "Automate tasks seamlessly",
  main: JSON.stringify({ entry: "index.js" }),
  created_at: "2025-06-28T10:30:00.000Z",
  updated_at: null,
});

packageMap.set("pkg2", {
  name: "Scheduler X",
  description: "Flexible scheduling engine",
  main: "",
  created_at: "2025-06-29T12:00:00.000Z",
  updated_at: null,
});

packageMap.set("pkg3", {
  name: "Task Runner",
  description: "Run tasks efficiently",
  main: JSON.stringify({ entry: "task.js" }),
  created_at: "2025-06-27T08:15:00.000Z",
  updated_at: null,
});

setData(
  "package",
  [...packageMap.entries()].map(([id, value]) => ({
    id,
    name: value.name,
    description: value.description,
    main: value.main,
    created_at: value.created_at,
    updated_at: value.updated_at,
  }))
);

// QUERIES

const updatePackageName = (id: string, name: string) =>
  store
    .update(taskWishPackages)
    .set({ name })
    .where(eq(taskWishPackages.id, id));

const listPackages = (limit: number = 20) =>
  store
    .select({
      id: taskWishPackages.id,
      createdAt: taskWishPackages.createdAt,
      name: taskWishPackages.name,
    })
    .from(taskWishPackages)
    .limit(limit)
    .orderBy(desc(taskWishPackages.createdAt));

// QUERY ROUTER

const PackageQueries = {
  listPackages,
  updatePackageName,
};

const { key } = getQueryInfo(PackageQueries.updatePackageName);

console.log("QUERY", key);

// const packageResolver = Resolver(Queries).resolve({
//   listPackages: () => {},
// });

const result = useLoadQuery(PackageQueries.listPackages());

console.table(result);

const result2 = useLoadQuery(
  PackageQueries.updatePackageName(result.at(0)!.id, "asd")
);

console.table(result2);

const finalResult = useLoadQuery(PackageQueries.listPackages());

console.table(finalResult);
