import { Action } from "../../src";

export const { succeed } = Action("succeed").run(async () => ({
  success: true,
}));
