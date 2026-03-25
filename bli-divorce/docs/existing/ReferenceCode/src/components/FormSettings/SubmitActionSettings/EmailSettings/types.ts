export interface EmailAction {
    id: number;
    name: string;
    active: boolean;
    rules: string[];
    run_on_resubmit: boolean;
    parent_form: number;
    subject: string;
    body: string;
    from_addr: string;
    from_name: string;
    to: string[];
    to_bcc: string[];
    to_cc: string[];
    reply_to: string[];
    include_result: boolean;
}
