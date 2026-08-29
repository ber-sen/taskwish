import { actor } from "./actor";

export const { createCustomer } = actor()
  .on("Command", "createCustomer")

  .input({ name: "string", email: "string" })

  .run(function () {
    this.state.customers.push(this.input);
    return this.state.customers.at(-1)!;
  });
