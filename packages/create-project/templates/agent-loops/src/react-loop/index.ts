import { actor } from "./react-loop";
import { runReactLoop } from "./run-react-loop";

export const { ReActLoop } = actor().service({ runReactLoop });
