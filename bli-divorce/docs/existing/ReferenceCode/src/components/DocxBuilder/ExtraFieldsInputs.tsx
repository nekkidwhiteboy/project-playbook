import { Checkbox, Form, Input, InputNumber, Select } from "antd";
import type { FormValues } from "components/DynamicForm/types";
import { replacePipes } from "components/DynamicForm/util";
import type { ExtraField, TemplateSet } from "./types";

const ExtraFieldsInputs = ({
    templateSet,
    context,
}: {
    templateSet?: TemplateSet;
    context?: FormValues;
}) => {
    return (
        <>
            {getExtraFieldSet(templateSet)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((templateSet) => getInputItem(templateSet, context))}
        </>
    );
};
export default ExtraFieldsInputs;

function getExtraFieldSet(templateSet?: TemplateSet): ExtraField[] {
    const fields: { [key: string]: ExtraField } = {};
    const templates = (templateSet?.templates ?? []).map((tr) => tr.template);

    for (let { extra_fields } of templates) {
        for (let field of extra_fields) {
            fields[field.name] = field;
        }
    }
    return Object.values(fields);
}

function getInputItem(field: ExtraField, context: FormValues = {}) {
    let child = null;
    if (typeof field.value === "number") {
        child = <InputNumber min={0} />;
    } else if (typeof field.value === "string" || field.value === null) {
        child = <Input.TextArea />;
    } else if (typeof field.value === "boolean") {
        child = <Checkbox />;
    } else if (typeof field === "object") {
        child = (
            <Select>
                {field.value.map((item, i) => (
                    <Select.Option value={JSON.stringify(item.value)} key={i}>
                        {item.label}
                    </Select.Option>
                ))}
            </Select>
        );
    }
    let initialValue = Array.isArray(field.value)
        ? JSON.stringify(field.value[0].value)
        : field.value;
    if (typeof initialValue === "string") {
        initialValue = replacePipes(initialValue, context);
    }
    return (
        <Form.Item
            label={field.name}
            name={field.name}
            key={field.name}
            valuePropName={
                typeof field.value === "boolean" ? "checked" : "value"
            }
            initialValue={initialValue}
        >
            {child}
        </Form.Item>
    );
}
