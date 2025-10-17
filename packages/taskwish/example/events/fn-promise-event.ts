import { Event } from "../../src";

export default Event("Fn Event", () => Promise.resolve({ name: "asdad", data: new Date() }));
