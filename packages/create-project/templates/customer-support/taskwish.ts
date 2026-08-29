import { Support } from "./src/support";

const supportCase = await Support.openCase({
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  subject: "I need help with my account",
});

console.log(supportCase);
