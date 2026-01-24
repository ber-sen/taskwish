import { Action } from "../../src";

export default Action("succeed").handler(() => ({ success: true }))
