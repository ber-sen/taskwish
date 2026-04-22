import type { StandardSchemaV1 } from "@standard-schema/spec";

export namespace TWProto {
  export type PeerName = string;

  export type Capability =
    | [type: "$" | ">" | (string & {}), namespace: string, capability: string]
    | [type: "$" | ">" | (string & {}), capability: string];

  export type Connect<
    Name extends PeerName,
    Capabilities extends Capability[],
  > = {
    $: "connect";
    peer: Name;
    capabilities: Capabilities;
  };

  export type ExecutionId =
    `${string}-${string}-7${string}-${string}-${string}`;

  export type AnySignalCommand = { ">": string } & Record<string, any>;

  export type Signal<SignalCommand extends AnySignalCommand> = {
    $: "signal";
    id: ExecutionId;
    run: SignalCommand;
  };

  export type Abort<Id extends ExecutionId> = { $: "abort"; id: Id };

  export type AnyTaskCommand =
    | ({ $: string } & Record<string, any>)
    | Array<{ $: string } & Record<string, any>>;

  export type TaskExecution<Command> = {
    $: "task";
    id: ExecutionId;
    run: Command;
  };

  export type Task<
    TaskCommand extends AnyTaskCommand,
    Return = unknown,
    Yield = undefined,
  > = AsyncGenerator<
    Yield extends undefined
      ? TaskExecution<TaskCommand> & Fulfillment
      : TaskExecution<TaskCommand> & Fulfillment & Yield,
    Return
  >;

  export type Fulfillment = {
    $: "fulfillment";
    id: ExecutionId;
    state?: "executing" | "completed" | "failed";
    step: {
      path: string;
      executor: string;
      data?: string;
      error?: Error;
    };
  };

  export interface Peer<Name extends PeerName> {
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

    /* Connect

    Peer A ---> Orchestator 
      
      Connect<"PeerA", [
        ["$", "sendEmail"],
        ["$", "PeerA", "generateReport"],
        ["&", "Playwright"],
        [">", "onUserSignup"]
      ]>
      
    */
    connect(peer: Peer<any>): Promise<Connect<Name, Capability[]>>;

    /* Signal
    
    Peer A → Signal<{ ">": "onEmail", subject: "Welcome", text: "Hi" }>

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
                            
      [Optional Abort<SIG1>]
    */
    signal<SignalCommand extends AnySignalCommand>(
      signal: SignalCommand,
      ctx?: { abortSignal?: AbortSignal },
    ): Promise<Signal<SignalCommand>>;

    abort<Id extends ExecutionId>(id: Id): Promise<Abort<Id>>;

    /* Run task

    Peer A → Task<[
      { $: "transformData", dataId: "d_001" },    // Peer C
      { $: "validateData", schemaId: "s_01" },    // Peer A
      { $: "sendReport", reportId: "r_2026" }     // Peer C
    ]>

      +--------+                +----------------+              +--------+
      | Peer A |                |  Orchestrator  |              | Peer C |
      +--------+                +----------------+              +--------+
                  handoff(Task)                                  
          +----------------------------->
                                            handoff(Task)   +---------------+
                                        <-----------------> | transformData |
    +--------------+  handoff(Task, Ctx)                    +---------------+
    | validateData | <------------------>
    +--------------+                      handoff(Task, Ctx)  +------------+
                                        <-------------------> | sendReport |
                      Result                                  +------------+                          
          <-----------------------------+
                  (Task Completed)

      [Optional Abort<SIGX>] --> stops execution
    */

    handoff<TaskCommand extends AnyTaskCommand, O>(
      task: TaskCommand,
      ctx?: Record<any, any> & {
        pid?: string; // parent id
        output?: StandardSchemaV1<O>;
        abortSignal?: AbortSignal;
      },
    ): Task<TaskCommand, O>;
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
