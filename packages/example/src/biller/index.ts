import { biller } from "./biller";
import { onGreeterMessage } from "./on-greeter-message";

export const { Biller } = biller().service({ onGreeterMessage });
