export interface Runnable<Stream, Result, Ctx> {
  run(): Promise<Result>;
  stream(): AsyncGenerator<Stream, Result, undefined>;
}