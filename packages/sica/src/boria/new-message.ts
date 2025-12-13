import { Event } from "../event";
import { Boria } from "./types";

export const NewMessage = Event<Boria.NewMessage<string>, "new-message">();
