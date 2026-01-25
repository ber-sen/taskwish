import { Action } from "../../src";

export const { succeed } = Action("succeed").handler(() => ({ success: true }));
