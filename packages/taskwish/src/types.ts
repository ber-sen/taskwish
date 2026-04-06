export type PeerId = string;
export type SignalId = string;
export type Timestamp = string; // ISO 8601
export type Signature = string;

export interface BaseMessage<Type extends string, Content = unknown> {
  v: 1;
  type: Type;
  sender: PeerId;
  ts: Timestamp;
  content: Content;
  sig?: Signature;
}

/* Peer Layer
 +--------+         +--------+         +--------+
 | Peer A |         | Peer B |         | Peer C |
 +----+---+         +----+---+         +----+---+
      |                  |                  |
      |---- Register ----|---- Update ------|---- Register ---->
      |                  |                  |
 [Peers announce capabilities to network]
*/

export interface PeerRegister<
  Capabilities extends ["$" | ">" | (string & {}), string][] = [],
> extends BaseMessage<"peerRegister", Capabilities> {}

export interface PeerUpdate<
  Capabilities extends ["$" | ">" | (string & {}), string][] = [],
> extends BaseMessage<"peerUpdate", Capabilities> {}

export interface PeerRemove extends BaseMessage<"peerRemove", {}> {}

/* Signal
          +----------------+
          |   Peer A       |
          | Broadcast SIG1 |
          +--------+-------+
                   |
                   v
        +----------+---------+
        |                    |
   +----v----+          +----v----+
   | Peer B  |          | Peer C  |
   +----+----+          +----+----+
        |                    |
        |                    |
  +-----v---------+    +-----v---------+
  |  Operation    |    |  Operation    |
  |  (done:false) |    |  (done:false) |
  +---------------+    +---------------+
        |                    |
        |                    |
  +-----v---------+    +-----v---------+
  |  Operation    |    |  Operation    |
  |  (done:true)  |    |  (done:true)  |
  +---------------+    +---------------+
        |
        v
 [Optional Abort(SIG1)]
*/

export interface Signal<
  SignalDef extends { ">": string } & Record<string, any> = { ">": "null" },
> extends BaseMessage<
    "signal",
    {
      id: SignalId;
      signal: SignalDef;
    }
  > {}

export interface Abort
  extends BaseMessage<
    "abort",
    {
      id: SignalId;
      reason?: string;
    }
  > {}

/* Task
    +--------+           +--------+
    | Peer A |           | Peer B |
    +---+----+           +---+----+
        |                    
        +---- Task(SIG2) --->|
                             |
                             |
                      +------v-------+
                      | processEmail |
                      +--------------+
                      Operation (done: false)
                             |
        +--------------------+
        |                    
   +---v----------+        
   | fetchMetrics |      
   +--------------+
      Operation (done: false)      
        |                    
        +---------+
                  |
          +-------v-------+
          | restartService |
          +----------------+
          Operation (streaming/final)

[Optional Abort(SIG2)] --> stops all in-flight execution
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

/* Operation
    
    Task      : process-data
    Sender    : Peer A
    Executor  : Peer B
    State     : executing

    ────────── Operation ──────────
    [✔] Step A
    [✔] Step B
    [✖] Step C
    [~] Step D
    [ ] Result
*/

export interface Operation<Result = unknown>
  extends BaseMessage<
    "op",
    {
      id: SignalId;

      // state
      done: boolean;
      ok?: boolean;

      // data
      data?: Result;
    }
  > {}

export type Message =
  | PeerRegister
  | PeerUpdate
  | PeerRemove
  | Signal
  | Task
  | Operation
  | Abort;

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
  ├── B1: [[">","onNewComment"], ["$","moderateComment"], ["$","aggregateResults"]]
  └── B2: [[">","onServerAlert"], ["$","restartService"], ["$","fetchMetrics"], [">","onHighCPU"]]

  Cross-Global Workflow (Synchronous)
  -----------------------------------
  Peer B1 → Task<[
    { $: "fetchMetrics", target: "api-server" },           // B2
    { $: "processEmail", emailId: "eml_123" },             // A1
    { $: "aggregateResults" },                             // B1
    { $: "generateThumbnail", fileId: "file_456" },        // A2
    { $: "sendInvoice", invoiceId: "INV-2026-0423-001" },  // A3
    { $: "restartService", service: "api" }                // B2
  ]>

  Flow:
  1. `Task` created and sent by Peer B1

  2. Global registry resolves actions:
    ├─ "fetchMetrics"      → B2
    ├─ "processEmail"      → A1
    ├─ "aggregateResults"  → B1
    ├─ "generateThumbnail" → A2
    ├─ "sendInvoice"       → A3
    └─ "restartService"    → B2

  3. Workflow executes synchronously, step-by-step:

    Step 1 — B2 (fetchMetrics)
    ├─ Operation 0 (collect CPU/memory) (done: false)
    └─ Operation 1 (metrics collected) (done: false)

    Step 2 — A1 (processEmail)
    ├─ Operation 0 (parse email) (done: false)
    ├─ Operation 1 (extract entities) (done: false)
    └─ Operation 2 (email processed) (done: false)

    Step 3 — B1 (aggregateResults)
    ├─ Operation 0 (combine metrics + email data) (done: false)
    └─ Operation 1 (aggregation complete) (done: false)

    Step 4 — A2 (generateThumbnail)
    ├─ Operation 0 (load file) (done: false)
    ├─ Operation 1 (resize image) (done: false)
    └─ Operation 2 (thumbnail generated) (done: false)

    Step 5 — A3 (sendInvoice)
    ├─ Operation 0 (prepare invoice) (done: false)
    ├─ Operation 1 (send email) (done: false)
    └─ Operation 2 (invoice sent) (done: false)

    Step 6 — B2 (restartService)
    ├─ Operation 0 (stop service) (done: false)
    ├─ Operation 1 (start service) (done: false)
    └─ Final aggregated Operation (done: true) ← **sent only at the end**

  Peer B1
  -------
  Receives a single aggregated `Operation` with `done: true` after the full workflow completes.

  Notes
  -----
  - Workflow originates from B1 and spans local (B1, B2) and remote (A1, A2, A3) peers  
  - Action names (`$`) are globally unique and used for routing  
  - Routing is resolved via capability registry across peers  
  - Each intermediate step emits Operations with `done: false`  
  - Only the final step emits the **aggregated Operation with `done: true`**
*/
