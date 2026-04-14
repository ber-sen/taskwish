import { RpcTarget } from "capnweb";
import type { StandardSchemaV1 } from "@standard-schema/spec";
export namespace TWProto {
  export type PeerName = string

  export type Capability = ["$" | ">" | (string & {}), string];

  export type ExecutionId =
    `${string}-${string}-7${string}-${string}-${string}`;

  export type SignalInput = { ">": string } & Record<string, any>;

  export type Signal<S extends SignalInput> = { id: ExecutionId; signal: S };

  export type TaskInput =
    | ({ $: string } & Record<string, any>)
    | Array<{ $: string } & Record<string, any>>;

  export type Task<S extends TaskInput, Output = unknown> = {
    id: ExecutionId;
    task: S;
    result: Output;
  };

  export type Fulfillment = {
    state?: "executing" | "completed" | "failed";
    step: {
      path: string;
      executor: string;
      data?: string;
      error?: Error;
    };
  };

  export interface Peer<Name extends PeerName> extends RpcTarget {
    /* Capability State Timeline 
    
    - t0  (initial state)

      capabilities ---> [
        ["$", "sendEmail"],
        ["$", "generateReport"],
        [">", "onUserSignup"]
      ]

    - t1  (peer offline)

      capabilities ---> []
      
    */
    capabilities(): Promise<Capability[]>;

    /* Orchestrator Connection

            connect(orchestrator)
    Peer ───────────────────────────▶ Orchestrator
      │                                  │
      │                                  │
      │──────── returns ───────────────▶ │
      │        Capability[]              │
      │                                  │
      ▼                                  ▼
    capabilities()                 snapshot/state
    
    */

    connect(
      orchestrator: Orchestrator,
    ): Promise<{ name: Name; capabilities: Capability[] }>;
  }

  export interface Orchestrator {
    /* Signal
  Peer A → Signal<{ ">": "onEmail", subject: "Welcome" }>

               +---------+
               | Peer A  |
               +----+----+
                    |
                  (SIG1)
                    |
                    v
             +--------------+
             | Orchestrator |
             +------+-------+
                    |
             (Forward SIG1)
                    |
        +-----------+-----------+
        |                       |
   +----v----+             +----v----+
   | Peer B  |             | Peer C  |
   +----+----+             +----+----+
        |                       |
  +-----v-----+         +-------v--------+
  | Log email |         | Generate reply |
  +-----------+         +----------------+
                                |
                            +---v---+
                            | Reply |
                            +-------+
                            
    [Optional Abort(SIG1)]
  */
    signal<S extends SignalInput>(signal: S): Signal<S>;

    abort(id: ExecutionId): Promise<Boolean>;

    /* Task
  Peer A → Task<[
    { $: "transformData", dataId: "d_001" },    // Peer C
    { $: "validateData", schemaId: "s_01" },    // Peer A
    { $: "sendReport", reportId: "r_2026" }     // Peer C
  ]>

    +--------+                +----------------+              +--------+ 
    | Peer A |                |  Orchestrator  |              | Peer C |
    +--------+                +----------------+              +--------+
        |                                                 
        +-------- run(Task) ---------->
                                      |        
                                      |                   +---------------+
                                      +-----run(Step)---> | transformData |
                                                          +---------------+
                                                                  |
                                      <-----Result----------------+
+----------------+    RunStep(CTX1)   |
| validateData   | <------------------+
+----------------+ 
        |
        +---Append(CTX1, Result)------> 
                                      |    RunStep(CTX1)    +------------+
                                      +-------------------> | sendReport |
                                                            +------------+
                                                                  |
                                      <----Append(CTX1, Result)---+
                                      |
        <-----------------Result------+
                     (Task Completed)

    [Optional Abort(SIGX)] --> stops execution
*/

    run<T extends TaskInput, O>(
      task: T,
      output?: StandardSchemaV1<O>,
    ): Task<T, O>;
  }

  /* Fulfillment
    
    Task      : SIG2
    Sender    : Peer A
    State     : executing

    ────────── Steps ──────────
    [✔] Step A
    [✔] Step B
    [✖] Step C
    [~] Step D
    [ ] Result
*/
}
