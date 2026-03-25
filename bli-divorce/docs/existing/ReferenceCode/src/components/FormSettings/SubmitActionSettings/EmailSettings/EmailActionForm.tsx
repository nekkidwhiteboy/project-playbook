import { Button, Form, Input, Space, Switch, Typography } from "antd";
import RuleItemList from "components/FormSettings/RuleItemList";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EmailEditor from "./EmailEditor";
import type { EmailAction } from "./types";

interface $EmailAction
    extends Omit<EmailAction, "to" | "to_bcc" | "to_cc" | "reply_to"> {
    to: string;
    to_bcc: string;
    to_cc: string;
    reply_to: string;
}
interface EmailActionFormProps {
    initialValues?: EmailAction;
    onFinish: (values: EmailAction) => Promise<void>;
}

export default function EmailActionForm({
    initialValues,
    onFinish,
}: EmailActionFormProps) {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [showMore, setShowMore] = useState(false);
    return (
        <Form<$EmailAction>
            form={form}
            initialValues={{
                name: "",
                active: false,
                rules: [],
                run_on_resubmit: false,
                subject: "",
                body: "",
                include_result: false,
                from_addr: "",
                from_name: "",
                ...initialValues,
                to: initialValues?.to.join(", ") ?? "",
                to_bcc: initialValues?.to_bcc.join(", ") ?? "",
                to_cc: initialValues?.to_cc.join(", ") ?? "",
                reply_to: initialValues?.reply_to.join(", ") ?? "",
            }}
            onFinish={(values) =>
                onFinish({
                    ...values,
                    // Filter out any blank rules
                    rules: values.rules.filter((r) => !!r),
                    // Reformat to_* fields into list format
                    to: values.to.split(/,\s*/),
                    to_bcc: values.to_bcc?.split(/,\s*/) ?? [],
                    to_cc: values.to_cc?.split(/,\s*/) ?? [],
                    reply_to: values.reply_to.split(/,\s*/),
                })
            }
            validateMessages={{
                required: "This field is required",
            }}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
            preserve
        >
            <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true }, { min: 4, max: 50 }]}
            >
                <Input />
            </Form.Item>
            <Form.Item label="Active" name="active" valuePropName="checked">
                <Switch />
            </Form.Item>
            <Form.Item
                label="Run on Resubmit"
                name="run_on_resubmit"
                valuePropName="checked"
            >
                <Switch />
            </Form.Item>
            <Form.Item label="To" required>
                <Space.Compact direction="vertical" block>
                    <Form.Item name="to" rules={[{ required: true }]} noStyle>
                        <Input />
                    </Form.Item>
                    <Typography.Text type="secondary">
                        Multiple values can be separated with a comma (,)
                    </Typography.Text>
                    <Typography.Link onClick={() => setShowMore((v) => !v)}>
                        {showMore ? "show less" : "show more"}
                    </Typography.Link>
                </Space.Compact>
            </Form.Item>
            {showMore && (
                <>
                    <Form.Item
                        label="Cc"
                        name="to_cc"
                        help="Multiple values can be separated with a comma (,)"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="Bcc">
                        <Space.Compact direction="vertical" block>
                            <Form.Item name="to_bcc" noStyle>
                                <Input />
                            </Form.Item>
                            <Typography.Text type="secondary">
                                Multiple values can be separated with a comma
                                (,)
                            </Typography.Text>
                            <Typography.Link onClick={() => setShowMore(false)}>
                                show less
                            </Typography.Link>
                        </Space.Compact>
                    </Form.Item>
                </>
            )}
            <Form.Item label="From" required>
                <Input.Group compact>
                    <Form.Item
                        name="from_name"
                        rules={[
                            {
                                max: 50,
                                message: "Cannot exceed 50 characters",
                            },
                        ]}
                        noStyle
                    >
                        <Input
                            style={{ width: "40%" }}
                            placeholder="Display Name"
                        />
                    </Form.Item>
                    <Form.Item
                        name="from_addr"
                        rules={[
                            { required: true },
                            { type: "email", message: "Invalid email" },
                        ]}
                        required
                        noStyle
                    >
                        <Input
                            type="email"
                            style={{ width: "60%" }}
                            placeholder="Email Address"
                        />
                    </Form.Item>
                </Input.Group>
            </Form.Item>
            <Form.Item
                label="Reply To"
                name="reply_to"
                rules={[{ required: true }]}
                extra="Multiple values can be separated with a comma (,)"
                required
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Subject"
                name="subject"
                rules={[
                    { required: true },
                    { max: 100, message: "Cannot exceed 100 characters" },
                ]}
                required
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Body"
                name="body"
                rules={[
                    { required: true },
                    {
                        max: 10_000,
                        message: "Cannot exceed 10000 characters",
                    },
                ]}
                required
                extra={
                    <Typography.Text type="secondary">
                        <Typography.Text type="secondary" keyboard>
                            Ctrl+Shift+F
                        </Typography.Text>
                        to toggle Fullscreen
                    </Typography.Text>
                }
            >
                <EmailEditor />
            </Form.Item>
            <Form.Item
                label="Include Result PDF"
                name="include_result"
                valuePropName="checked"
            >
                <Switch />
            </Form.Item>
            <Form.Item name="rules" label="Rules">
                <RuleItemList name="rules" />
            </Form.Item>
            <Form.Item shouldUpdate style={{ margin: "auto 16px" }}>
                {() => (
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {initialValues ? "Save" : "Create"}
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
