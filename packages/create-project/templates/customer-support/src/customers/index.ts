import { actor } from "./actor";
import { createCustomer } from "./create-customer";
import { listCustomers } from "./list-customers";

export const { Customers } = actor().service({
  createCustomer,
  listCustomers,
});
