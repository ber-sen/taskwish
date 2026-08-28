import { Actor, State } from "taskwish";

const { actor } = Actor("Counter").scope(
  State({ count: 0 }),
);

export const { increase } = actor()
  .on("Command", "increase")

  .run(function () {
    return ++this.state.count;
  });

export const { decrease } = actor()
  .on("Command", "decrease")

  .run(function () {
    return --this.state.count;
  });

export const { Counter } = actor().service({ increase, decrease });
