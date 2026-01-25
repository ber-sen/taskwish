import { Action } from "../../src";

export const { succeed } = Action("succeed").handler(async () => ({
  success: true,
}));
