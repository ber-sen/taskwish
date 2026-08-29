import { actor } from "./actor";

export const { openCase } = actor()
  .on("Command", "openCase")

  .input({
    customerName: "string",
    customerEmail: "string",
    subject: "string",
  })

  .run(async function () {
    const customer = await this.actions.customers.createCustomer({
      name: this.input.customerName,
      email: this.input.customerEmail,
    });
    const ticket = await this.actions.tickets.openTicket({
      customerId: customer.id,
      subject: this.input.subject,
    });
    return { customer, ticket };
  });
