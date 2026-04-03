/**
 * @module @kunkun/kkrpc
 * @description kkrpc is a library for building RPC systems.
 * This module is the main entrypoint of the library.
 * It contains all core modules of the library.
 *
 * Exported modules includes
 * - web worker
 * - nodejs/bun
 * - deno
 * - websocket
 * - http
 * - hono-websocket
 * - elysia-websocket
 * - RPC Channel
 * - serialization
 *
 * Optional adapters with peer dependencies (import separately):
 * - `kkrpc/rabbitmq` - RabbitMQ adapter (requires `amqplib`)
 * - `kkrpc/kafka` - Kafka adapter (requires `kafkajs`)
 * - `kkrpc/redis-streams` - Redis Streams adapter (requires `ioredis`)
 * - `kkrpc/nats` - NATS adapter (requires `@nats-io/transport-node`)
 * - `kkrpc/socketio` - Socket.IO adapter (requires `socket.io`)
 *
 * If you want to use this library in browser, please use `/browser` instead.
 */
export * from "./src/adapters/worker"
export * from "./src/adapters/bun"
export * from "./src/adapters/node"
export * from "./src/adapters/websocket"
export * from "./src/adapters/http"
export * from "./src/adapters/hono-websocket"
export * from "./src/interface"
export * from "./src/channel"
export * from "./src/utils"
export * from "./src/serialization"
export * from "./src/transfer"
export * from "./src/transfer-handlers"
export * from "./src/relay"
export * from "./src/standard-schema"
export * from "./src/validation"
export * from "./src/middleware"
