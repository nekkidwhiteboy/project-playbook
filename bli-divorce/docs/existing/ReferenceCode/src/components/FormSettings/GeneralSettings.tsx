import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Space } from "antd";
import { isAxiosError } from "axios";
import {
    useFormSchema,
    useUpdateFormSchema,
} from "components/DynamicForm/hooks";
import type { FormSchema } from "components/DynamicForm/types";
import LoadingIndicator from "components/LoadingIndicator";
import { useCurrentRole } from "hooks/useCurrentUser";
import { useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";

const layout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 14 },
};

export function Component() {
    const { isAdmin } = useCurrentRole();

    const params = useParams();
    const formId = parseInt(params.formId ?? "0");

    const queryClient = useQueryClient();

    const [form] = Form.useForm();

    const { data, isFetching } = useFormSchema({
        variables: { id: formId },
        staleTime: 5 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        throwOnError: true,
    });

    useEffect(() => {
        form.setFieldsValue(data);
    }, [data, form]);

    const updateMutation = useUpdateFormSchema({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: useFormSchema.getKey({ id: formId }),
            }),
        onError: (error) => {
            if (
                isAxiosError(error) &&
                error.response &&
                error.response.status === 400
            ) {
                form.setFields(
                    Object.entries(error.response.data).map(([key, val]) => ({
                        name: key,
                        errors: val as string[],
                    }))
                );
            }
        },
    });

    const onFinish = useCallback(
        async (values: FormSchema) =>
            updateMutation.mutateAsync({ id: formId, values }),
        [formId, updateMutation]
    );

    if (isFetching) {
        return (
            <div className="main-content">
                <LoadingIndicator />
            </div>
        );
    }

    return (
        <div className="main-content">
            <Helmet
                title={`General | Settings | ${
                    data?.name ?? ""
                } | Barrow Brown Carrington, PLLC`}
            />
            <Form
                form={form}
                {...layout}
                onFinish={onFinish}
                initialValues={data}
                disabled={!isAdmin}
            >
                <Form.Item
                    name="name"
                    label="Name"
                    rules={[{ required: true }]}
                >
                    <Input maxLength={30} />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true }]}
                >
                    <Input.TextArea maxLength={120} showCount />
                </Form.Item>
                <Form.Item
                    name="slug"
                    label="Slug"
                    rules={[
                        { max: 50 },
                        { required: true },
                        {
                            pattern: /^[\w\-\d]+$/,
                            message:
                                "Slug can only contain letters, numbers and dashes (-)",
                        },
                    ]}
                >
                    <Input maxLength={50} />
                </Form.Item>
                <Form.Item
                    name="max_results_per_client"
                    label="Max Results Per Client"
                    extra="Leave blank to disable limit"
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Form.Item
                    name="max_results_per_staff"
                    label="Max Results Per Staff"
                    extra="Leave blank to disable limit"
                >
                    <InputNumber min={0} />
                </Form.Item>
                <Form.Item wrapperCol={{ span: 14, offset: 8 }} shouldUpdate>
                    {() => (
                        <Space wrap>
                            <Button
                                type="primary"
                                htmlType="submit"
                                disabled={!form.isFieldsTouched()}
                            >
                                Save
                            </Button>
                            <Button
                                onClick={() => {
                                    form.resetFields();
                                    form.setFieldsValue(data);
                                }}
                                disabled={!form.isFieldsTouched()}
                            >
                                Cancel
                            </Button>
                        </Space>
                    )}
                </Form.Item>
            </Form>
        </div>
    );
}
Component.displayName = "GeneralSettings";
