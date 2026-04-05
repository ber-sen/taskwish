export type PeerId = string;
export type EventId = string;
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

// Peer Layer
export interface PeerRegister
  extends BaseMessage<"peerRegister", { eventTypes: string[] }> {}

export interface PeerUpdate
  extends BaseMessage<"peerUpdate", { payload?: unknown }> {}

export interface PeerRemove extends BaseMessage<"peerRemove", {}> {}

// Emit Layer
export interface Emit<Params = unknown>
  extends BaseMessage<
    "emit",
    {
      id: EventId;
      eventType: string;
      params: Params;
    }
  > {}

export interface Abort
  extends BaseMessage<
    "abort",
    {
      id: EventId;
      reason?: string;
    }
  > {}

// Execution Layer
export interface ExecutionChunk<Chunk = unknown>
  extends BaseMessage<
    "executionChunk",
    {
      id: EventId;
      eventType: string;
      chunkIndex: number;
      chunkCount?: number;
      params: Chunk;
    }
  > {}

export interface Execution<Result = unknown>
  extends BaseMessage<
    "execution",
    {
      id: EventId;
      eventType: string;
      ok: boolean;
      result: Result;
    }
  > {}

export type Message =
  | PeerRegister
  | PeerUpdate
  | PeerRemove
  | Emit
  | Abort
  | ExecutionChunk
  | Execution;
