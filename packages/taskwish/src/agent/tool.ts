import { TaskWish } from "../types";

export function Tool(action: TaskWish.Action<any, any, any>): TaskWish.Tool 

export function Tool(action: TaskWish.Action<any, any, any>): TaskWish.Tool

export function Tool(runnable: any){
  return runnable.run
}
