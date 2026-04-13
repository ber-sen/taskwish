import { RpcTarget } from "capnweb";

export namespace Proto {
  export type Capability = ["$" | ">" | (string & {}), string];

  export interface Peer extends RpcTarget {
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

    connect(orchestrator: Orchestrator): Promise<Capability[]>;
  }

  export type SignalId = `${string}-${string}-7${string}-${string}-${string}`;

  export type Signal = { ">": string } & Record<string, any>;

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
    signal<SignalDef extends Signal>(
      signal: SignalDef,
    ): Promise<{ id: SignalId }>;
  }

  export interface Abort
    extends BaseMessage<
      "abort",
      {
        id: SignalId;
      }
    > {}

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
        +------- Task(SIGX) ---------->
                                      |        
                                      |                   +---------------+
                                      +-----RunStep()---> | transformData |
                                                          +---------------+
                                                                  |
                                      <-----Result----------------+
                                      |
                        +-------------v-------------+
                        | CTX1 = ExecutionContext() |
                        | Append(CTX1, Result)      |
                        +---------------------------+
                                      |
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
  export interface Task<
    TaskDef extends
      | ({ $: string } & Record<string, any>)
      | Array<{ $: string } & Record<string, any>> = { $: "noop" },
  > extends BaseMessage<
      "task",
      {
        id: SignalId;
        task: TaskDef;
      }
    > {}

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

  export interface Fulfillment<Result = unknown, Error = unknown>
    extends BaseMessage<
      "fulfillment",
      {
        taskId: SignalId;
        sender: PeerName;
        state?: "executing" | "completed" | "failed";

        step: {
          path: StepPath;
          executor: PeerName;
          data?: Result;
          error?: Error;
        };
      }
    > {}

  export type Message = Peer | Signal | Task | Fulfillment | Abort;

  /*
Global Registry
===============
Peer A registered
-----------------
Local Peers:
├── A1: [[">","onNewEmail"], ["$","processEmail"], [">","onUserSignup"]]
├── A2: [[">","onFileUpload"], ["$","generateThumbnail"]]
└── A3: [[">","onPaymentReceived"], ["$","sendInvoice"], ["$","updateCRM"]]

Peer B registered
-----------------
Local Peers:
├── B1: [[">","onNewComment"], ["$","moderateComment"], ["$","aggregateResults"], ["$","processEmail"]]  
└── B2: [[">","onServerAlert"], ["$","restartService"], ["$","fetchMetrics"], [">","onHighCPU"]]

Cross-Global Workflow (Synchronous)
-----------------------------------
Peer B1 → Task<[
  { $: "fetchMetrics", target: "api-server" },           // B2
  { $: "processEmail", emailId: "eml_123" },             // local B1 overrides global A1
  { $: "aggregateResults" },                             // B1
  { $: "generateThumbnail", fileId: "file_456" },        // A2
  { $: "sendInvoice", invoiceId: "INV-2026-0423-001" },  // A3
  { $: "restartService", service: "api" }                // B2
]>

Flow:
1. Task created and sent by Peer B1

2. Global registry resolves actions (local overrides global):
   ├─ "fetchMetrics"      → B2
   ├─ "processEmail"      → B1 (local overrides A1)
   ├─ "aggregateResults"  → B1
   ├─ "generateThumbnail" → A2
   ├─ "sendInvoice"       → A3
   └─ "restartService"    → B2

3. Workflow executes synchronously, step-by-step:

   Step 1 — B2 (fetchMetrics)
   ├─ Operation chunk (collect CPU/memory)
   └─ Operation chunk (metrics collected)

   Step 2 — B1 (processEmail) ← local override
   ├─ Operation chunk (parse email)
   ├─ Operation chunk (extract entities)
   └─ Operation chunk (email processed)

   Step 3 — B1 (aggregateResults)
   ├─ Operation chunk (combine metrics + email data)
   └─ Operation chunk (aggregation complete)

   Step 4 — A2 (generateThumbnail)
   ├─ Operation chunk (load file)
   ├─ Operation chunk (resize image)
   └─ Operation chunk (thumbnail generated)

   Step 5 — A3 (sendInvoice)
   ├─ Operation chunk (prepare invoice)
   ├─ Operation chunk (send email)
   └─ Operation chunk (invoice sent)

   Step 6 — B2 (restartService)
   ├─ Operation chunk (stop service)
   ├─ Operation chunk (start service)
   └─ Operation (done: true)

Peer B1
-------
Receives a single `Operation` with `done: true` after the full workflow completes.

Notes
-----
- Workflow originates from B1 and spans local (B1, B2) and remote (A1, A2, A3) peers  
- Local peers override global peers when action names conflict   
- Routing is resolved via capability registry across peers  
- Each intermediate step emits Operation chunks
- Only the final step emits the Operation chunks with `done: true`
*/
}
