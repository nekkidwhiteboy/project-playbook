import { FormInfo } from "components/DynamicForm/types";

export type ExtraField = {
    name: string;
    value:
        | number
        | string
        | boolean
        | null
        | {
              label: string;
              value: any;
          }[];
};

export interface TemplateInfo {
    id: number;
    name: string;
}

export interface Template {
    id: number;
    name: string;
    output_filename: string;
    extra_fields: ExtraField[];
    visible_to: "Owner" | "Anyone";
    owner: number;
    file_name: string;
    preprocessor: string;
    generator: string;
}

export interface TemplateSet {
    id: number;
    form: FormInfo | number;
    name: string;
    visible_to: "Owner" | "Anyone";
    owner: number;
    rules?: string[];
    templates?: TemplateRule[];
}

export interface TemplateRule {
    rule: string;
    template: Template;
}
