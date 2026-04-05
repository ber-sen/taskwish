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
    
    Task   : process-data
    Flow   : Peer A → Peer B
    State  : executing

    ──────── Execution ────────
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

// Abort
export interface Abort
  extends BaseMessage<
    "abort",
    {
      id: SignalId;
      reason?: string;
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
