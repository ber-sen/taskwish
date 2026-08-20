export declare const Slack: import("@taskwish/core").TW.Service<any, {
    postMessage: NoInfer<(input: import("slack-web-api-client").ChatPostMessageRequest) => Promise<import("slack-web-api-client").ChatPostMessageResponse>> & import("@taskwish/core").TW.ActionRuntime<"Slack::post_message", (input: import("slack-web-api-client").ChatPostMessageRequest) => Promise<import("slack-web-api-client").ChatPostMessageResponse>> & {
        ctx(context?: import("@taskwish/core").TW.ActionContext<{
            abortSignal?: import("@taskwish/core").TW.Configurable<AbortSignal>;
        }> | undefined): import("@taskwish/core").TW.ActionRuntime<"Slack::post_message", (input: import("slack-web-api-client").ChatPostMessageRequest) => Promise<import("slack-web-api-client").ChatPostMessageResponse>>;
    } & import("@taskwish/core").TW.Resource<"Slack::post_message"> & import("@taskwish/core").TW.Attributable<null>;
}, {}>;
