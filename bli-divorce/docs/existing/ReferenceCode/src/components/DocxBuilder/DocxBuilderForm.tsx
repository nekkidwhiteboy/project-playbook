import { Form, type FormInstance, Select } from "antd";
import type { FormValues } from "components/DynamicForm/types";
import ExtraFieldsInputs from "./ExtraFieldsInputs";
import type { TemplateSet } from "./types";

interface DocxBuilderFormProps {
    form: FormInstance<{ setId: number; [key: string]: any }>;
    templateSets: TemplateSet[];
    context?: FormValues;
    disabled?: boolean;
}

const DocxBuilderForm = ({
    form,
    templateSets,
    disabled,
    context = {},
}: DocxBuilderFormProps) => {
    const sets = new Map(templateSets.map((set) => [set.id, set]));

    return (
        <Form
            form={form}
            initialValues={{ setId: templateSets[0]?.id ?? null }}
            disabled={disabled}
            labelCol={{ xs: 24, sm: 6 }}
            preserve={false}
            labelWrap
        >
            <Form.Item name="setId" label="Template Set">
                <Select placeholder="No Template Sets">
                    {templateSets.map((templateSet) => (
                        <Select.Option
                            value={templateSet.id}
                            key={templateSet.id}
                        >
                            {templateSet.name}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>
            <Form.Item noStyle dependencies={["setId"]}>
                {({ getFieldValue }) => (
                    <ExtraFieldsInputs
                        templateSet={sets.get(getFieldValue("setId"))}
                        context={context}
                    />
                )}
            </Form.Item>
        </Form>
    );
};

export default DocxBuilderForm;
