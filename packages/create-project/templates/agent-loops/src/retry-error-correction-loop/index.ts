import { actor } from "./retry-error-correction-loop";
import { runRetryErrorCorrectionLoop } from "./run-retry-error-correction-loop";

export const { RetryErrorCorrectionLoop } = actor().service({ runRetryErrorCorrectionLoop });
