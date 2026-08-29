import { actor } from "./actor";

export const { listCustomers } = actor()
  .on("Command", "listCustomers")

  .run(function () {
    return this.state.customers;
  });
