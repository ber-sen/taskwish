import type { StandardSchemaV1 } from "@standard-schema/spec";

export namespace TWProto {
  export type NodeName = string;

  export type Capability = [
    type: "$" | "&" | "->" | (string & {}),
    capability: string,
  ];

  export type Connect<
    Name extends NodeName,
    Capabilities extends Capability[],
  > = {
    $: "connect";
    node: Name;
    capabilities: Capabilities;
  };

  export type ExecutionId =
    `${string}-${string}-7${string}-${string}-${string}`;

  export type AnySignalCommand = { "->": string } & Record<string, any>;

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

  export interface Node<Name extends NodeName> {
    /* Capability State Timeline 
    
    - t0  (initial state)

      capabilities ---> [
        ["$", "send_email"],
        ["$", "generate_report"],
        ["->", "Message"]
      ]

    - t1  (node offline)

      capabilities ---> []
      
    */
    capabilities(): Promise<Capability[]>;

    /* Connect

    Node A ---> Orchestator 
      
      Connect<"NodeA", [
        ["$", "send_email"],
        ["$", "generate_report"],
        ["&", "Playwright"],
        ["->", "Message"]
      ]>
      
    */
    connect(node: Node<any>): Promise<Connect<Name, Capability[]>>;

    /* Signal
    
    Node A -> Signal<{ "->": "Email", subject: "Welcome", text: "Hi" }>

                 +---------+
                 | Node A  |
                 +----+----+
                      |
                    (SIG1)
                      |
                      v
               +--------------+
               | Coordinator  |
               +------+-------+
                      |
                (Forward SIG1)
                      |
          +-----------+-----------+
          |                       |
     +----v----+             +----v----+
     | Node B  |             | Node C  |
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

    Node A → Task<[
      { $: "transform_data", dataId: "d_001" },    // Node C
      { $: "validate_data", schemaId: "s_01" },    // Node A
      { $: "send_report", reportId: "r_2026" }     // Node C
    ]>

      +--------+                  +-------------+              +--------+
      | Node A |                  | Coordinator |              | Node C |
      +--------+                  +-------------+              +--------+
                  handoff(Task)                                  
          +----------------------------->
                                            handoff(Task)   +----------------+
                                        <-----------------> | transform_data |
  +---------------+  handoff(Task, Ctx)                     +----------------+
  | validate_data | <------------------>
  +---------------+                      handoff(Task, Ctx)   +-------------+
                                        <-------------------> | send_report |
                      Result                                  +-------------+
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
    Sender    : Node A
    State     : executing

    ────────── Steps ──────────
    [✔] Step A
    [✔] Step B
    [✖] Step C
    [~] Step D
    [ ] Result
  */
}
