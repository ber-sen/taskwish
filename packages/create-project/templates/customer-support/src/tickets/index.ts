import { actor } from "./actor";
import { closeTicket } from "./close-ticket";
import { listOpenTickets } from "./list-open-tickets";
import { openTicket } from "./open-ticket";

export const { Tickets } = actor().service({
  openTicket,
  closeTicket,
  listOpenTickets,
});
