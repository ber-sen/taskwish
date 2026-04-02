"use server";

import { Actor, Step } from "../../src";

const { Greeter } = Actor("Greeter");

// bye action
Greeter()
  .on("NewMessage")

  .run(
    Commander.Ask("asdasddas"),
    Commander.Notify("asdasddas"),
    
    Reply("asdasddas"),
  );
