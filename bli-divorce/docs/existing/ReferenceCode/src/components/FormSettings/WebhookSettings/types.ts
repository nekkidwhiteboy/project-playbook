export const enum WebhookEvent {
    NewResultSubmission = "NEW_RESULT_SUBMISSION",
}

export const WEBHOOK_EVENT_NAMES: { [key in WebhookEvent]: string } = {
    [WebhookEvent.NewResultSubmission]: "New Result Submission",
};

export interface Webhook {
    id: number;
    active: boolean;
    event: WebhookEvent;
    hook_url: string;
    params: { [key: string]: any };
    name: string;
}
