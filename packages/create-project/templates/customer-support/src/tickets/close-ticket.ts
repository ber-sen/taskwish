import { actor } from "./actor";

export const { closeTicket } = actor()
  .on("Command", "closeTicket")

  .input({ id: "string" })

  .run(function () {
    const ticket = this.state.tickets.find((item) => item.id === this.input.id);
    if (!ticket) throw new Error(`Ticket ${this.input.id} does not exist.`);
    ticket.status = "closed";
    return ticket;
  });
