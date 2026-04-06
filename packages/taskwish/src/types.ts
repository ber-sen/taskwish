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

export interface PeerRegister
  extends BaseMessage<"peerRegister", { eventTypes: string[] }> {}

export interface PeerUpdate
  extends BaseMessage<"peerUpdate", { payload?: unknown }> {}

export interface PeerRemove extends BaseMessage<"peerRemove", {}> {}

/* Signal
          +----------------+
          | Peer A         |
          | Broadcast SIG1 |
          +--------+-------+
                   |
        +----------+----------+
        |                     |
    +---v----+            +---v----+
    | Peer B |            | Peer C |
    +--------+            +--------+
        |                     |
  +-----v----------+     +----v-----------+
  | ExecutionChunk |     | ExecutionChunk |
  +----------------+     +----------------+
        |                     |
  +-----v-----+          +----v------+
  | Execution |          | Execution |
  +-----------+          +-----------+
        |
     [Optional Abort(SIG1)]
*/

export interface Signal<Params = unknown>
  extends BaseMessage<
    "signal",
    {
      id: SignalId;
      params: Params;
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
        |                    |
        |---- Task(SIG2) --> |  <-- Direct assignment
        |                    |
        |                +---v------------+
        |                | ExecutionChunk |
        |                +----------------+
        |                    |
        |                +---v-------+
        |                | Execution |
        |                +-----------+
        |
    [Optional Abort(SIG2)] --> stops Peer B execution
*/
export interface Task<Params = unknown>
  extends BaseMessage<
    "task",
    {
      id: SignalId;
      params: Params;
      executor: PeerId;
    }
  > {}

/* Execution
    
    Task      : process-data
    Sender    : Peer A
    Executor  : Peer B
    State     : executing

    ────────── Execution ──────────
    [✔] Step A
    [✔] Step B
    [✖] Step C
    [~] Step D
    [ ] Result
*/

export interface ExecutionChunk<Chunk = unknown>
  extends BaseMessage<
    "executionChunk",
    {
      id: SignalId;
      executor: PeerId;

      chunkIndex: number;
      chunkCount?: number;
      params: Chunk;
    }
  > {}

export interface Execution<Result = unknown>
  extends BaseMessage<
    "execution",
    {
      id: SignalId;
      executor: PeerId;

      ok: boolean;
      result: Result;
    }
  > {}

export type Message =
  | PeerRegister
  | PeerUpdate
  | PeerRemove
  | Signal
  | Task
  | ExecutionChunk
  | Execution
  | Abort;

/*
    Global Registry
    ===============
    Peer A registered
        • A1: ["task","signal"]
        • A2: ["task","signal"]
        • A3: ["task","signal"]
    Peer B registered
        • B1: ["task","signal"]
        • B2: ["task","signal"]

    Peer A (global)
    ---------------
    Local Peers:
    ├── A1
    ├── A2
    └── A3

    Peer B (global)
    ---------------
    Local Peers:
    ├── B1
    └── B2

    Cross-Global Task Assignment
    ----------------------------
    Peer B2 → Task(SIG100) → Peer A3
    │
    ├─ Task message (Task<Params>) sent to global Peer A
    │      └─ executor: "A3"
    ├─ Peer A routes task to local peer A3
    └─ Peer A3 executes task
        ├─ [✔] ExecutionChunk 0
        ├─ [✔] ExecutionChunk 1
        ├─ [~] ExecutionChunk 2 (in progress)
        └─ [ ] Execution result pending

    Peer B2
    -------
    └─ Receives execution progress and final Execution result from A3

    Notes
    -----
    - All messages use the same protocol types: 
    PeerRegister, PeerUpdate, PeerRemove, Task, ExecutionChunk, Execution, Signal, Abort.
    - Global registry publishes capabilities of internal peers.
    - Cross-global tasks specify the internal executor (A3) and flow naturally.
*/
