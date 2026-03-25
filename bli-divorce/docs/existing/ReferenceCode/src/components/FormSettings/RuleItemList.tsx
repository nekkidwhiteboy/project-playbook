import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, List, Typography } from "antd";
import { FormListProps } from "antd/lib/form";

export default function RuleItemList(props: Omit<FormListProps, "children">) {
    return (
        <Form.List {...props}>
            {(fields, { add, remove }) => (
                <List
                    dataSource={fields}
                    renderItem={({ key, ...field }, index) => (
                        <List.Item
                            key={key}
                            extra={
                                <Button
                                    icon={<CloseOutlined />}
                                    type="text"
                                    title="remove"
                                    onClick={() => remove(index)}
                                />
                            }
                            style={{ alignItems: "flex-start" }}
                        >
                            <Form.Item
                                {...field}
                                style={{ flexGrow: 1, marginBottom: 0 }}
                                rules={[
                                    { required: true },
                                    {
                                        max: 50,
                                        message: "Cannot exceed 50 characters",
                                    },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        </List.Item>
                    )}
                    footer={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => add()}
                        >
                            Add Rule
                        </Button>
                    }
                >
                    {fields.length === 0 && (
                        <List.Item style={{ paddingTop: 6 }}>
                            <Typography.Text type="secondary">
                                Always
                            </Typography.Text>
                        </List.Item>
                    )}
                </List>
            )}
        </Form.List>
    );
}
