import { Action } from "../../src";

export default Action("succeed").execute(() => ({ success: true }))
