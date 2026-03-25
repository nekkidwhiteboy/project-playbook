import { Button, Form, Input, Select, Space, Switch } from "antd";
import { MappedItemList } from "components/FormSettings/SubmitActionSettings/NewResultSettings/NewResultActionForm";
import { useNavigate } from "react-router-dom";
import { tryCatch } from "util/functions";
import { Webhook, WEBHOOK_EVENT_NAMES, WebhookEvent } from "./types";

interface $Webhook extends Omit<Webhook, "params"> {
    params: [string, string | null][];
}

interface WebhookFormProps {
    initialData?: Webhook;
    onFinish: (values: Webhook) => Promise<void>;
}

export default function WebhookForm({
    initialData,
    onFinish,
}: WebhookFormProps) {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    return (
        <Form<$Webhook>
            form={form}
            initialValues={{
                active: false,
                event: WebhookEvent.NewResultSubmission,
                hook_url: "",
                name: "",
                ...initialData,
                params: Object.entries(initialData?.params ?? {}).map(
                    ([key, val]) => [
                        key,
                        typeof val == "string" ? val : JSON.stringify(val),
                    ]
                ),
            }}
            onFinish={(values) =>
                onFinish({
                    ...values,
                    params: values.params.reduce(
                        (prev, [key, val]) =>
                            val === null
                                ? key
                                : {
                                      ...prev,
                                      [key]: tryCatch(
                                          () => JSON.parse(val),
                                          val
                                      ),
                                  },
                        {}
                    ),
                })
            }
            validateMessages={{
                required: "This field is required",
            }}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
        >
            <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true }, { min: 1, max: 100 }]}
            >
                <Input />
            </Form.Item>
            <Form.Item label="Active" name="active" valuePropName="checked">
                <Switch />
            </Form.Item>
            <Form.Item label="Event" name="event" rules={[{ required: true }]}>
                <Select
                    options={Object.entries(WEBHOOK_EVENT_NAMES).map(
                        ([value, label]) => ({ label, value })
                    )}
                />
            </Form.Item>
            <Form.Item
                label="Hook URL"
                name="hook_url"
                rules={[{ required: true }, { min: 1, max: 100 }]}
            >
                <Input type="url" />
            </Form.Item>
            <Form.Item label="Parameters" name="params">
                <MappedItemList
                    name="params"
                    addBtnLabel="Add Parameter"
                    emptyText="No Parameters"
                />
            </Form.Item>
            <Form.Item shouldUpdate style={{ margin: "auto 16px" }}>
                {() => (
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {initialData ? "Save" : "Create"}
                        </Button>
                        <Button onClick={() => navigate(-1)}>Cancel</Button>
                        <Button
                            onClick={() => form.resetFields()}
                            disabled={!form.isFieldsTouched()}
                        >
                            Reset
                        </Button>
                    </Space>
                )}
            </Form.Item>
        </Form>
    );
}
