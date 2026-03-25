export interface NewResultAction {
    id: number;
    name: string;
    active: boolean;
    rules: string[];
    run_on_resubmit: boolean;
    parent_form: number;
    new_result_form: number;
    item_map: { [key: string]: string };
}
