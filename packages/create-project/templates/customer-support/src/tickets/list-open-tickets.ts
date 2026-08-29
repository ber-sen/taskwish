import { actor } from "./actor";

export const { listOpenTickets } = actor()
  .on("Command", "listOpenTickets")

  .run(function () {
    return this.state.tickets.filter((ticket) => ticket.status === "open");
  });
