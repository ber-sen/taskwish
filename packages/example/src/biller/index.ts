import { actor } from "./biller";
import { onGreeterMessage } from "./on-greeter-message";

export const { Biller } = actor().service({ onGreeterMessage });
