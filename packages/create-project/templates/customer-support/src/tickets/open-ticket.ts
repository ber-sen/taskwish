import { actor } from "./actor";

export const { openTicket } = actor()
  .on("Command", "openTicket")

  .input({ customerId: "string", subject: "string" })

  .run(function () {
    this.state.tickets.push({ ...this.input, status: "open" });
    return this.state.tickets.at(-1)!;
  });
