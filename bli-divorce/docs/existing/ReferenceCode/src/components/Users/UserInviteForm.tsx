import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, List, Select } from "antd";
import { isAxiosError } from "axios";
import { useForms } from "components/DynamicForm/hooks";
import LoadingIndicator from "components/LoadingIndicator";
import dayjs from "dayjs";
import { UserRole, useCurrentRole } from "hooks/useCurrentUser";
import { CSSProperties, forwardRef, useImperativeHandle } from "react";

import "./Users.less";

export interface UserInvite {
    first_name: string;
    last_name: string;
    email: string;
    role: UserRole;
    initial_forms: number[];
    expiration_time: string | null;

    id: number;
    created_time: string;
    sent_time: string | null;
    accepted_time: string | null;
}

export type NewUserInvite = Omit<
    UserInvite,
    "id" | "created_time" | "sent_time" | "accepted_time"
>;

interface UserInviteFormProps {
    initialValues?: NewUserInvite;
    onSubmit: (values: NewUserInvite) => Promise<void> | void;
    style?: CSSProperties;
    disabled?: boolean;
}

export interface UserInviteFormRef {
    submit: () => Promise<void>;
    reset: () => void;
    clear: () => void;
}

const emptyValues = {
    first_name: "",
    last_name: "",
    email: "",
    role: UserRole.Client,
    initial_forms: [null],
    duration: 48,
    durationMul: 60,
    expiration_time: null,
};

const UserInviteForm = forwardRef<UserInviteFormRef, UserInviteFormProps>(
    ({ initialValues, onSubmit, style, disabled = false }, ref) => {
        const _initialValues = (() => {
            if (!initialValues) return emptyValues;
            const values = { ...initialValues };
            if (initialValues.expiration_time) {
                values.expiration_time = dayjs(
                    initialValues.expiration_time
                ).format("YYYY-MM-DDTHH:mm");
            }
            return values;
        })();
        const [form] = Form.useForm<NewUserInvite>();
        const { isOwner } = useCurrentRole();
        const { data: forms, isLoading: formsLoading } = useForms({
            staleTime: Infinity,
            gcTime: Infinity,
        });

        useImperativeHandle(ref, () => ({
            async submit() {
                return form
                    .validateFields()
                    .then((values) =>
                        onSubmit({
                            ...values,
                            initial_forms: values.initial_forms.filter(
                                (v) => !!v
                            ),
                            expiration_time: values.expiration_time
                                ? dayjs(values.expiration_time).format()
                                : null,
                        })
                    )
                    .catch((err) => {
                        if (isAxiosError(err) && err.response?.status === 400) {
                            form.setFields(
                                Object.entries(
                                    err.response.data as Record<
                                        string,
                                        string[]
                                    >
                                ).map(([name, errors]) => ({ name, errors }))
                            );
                            return Promise.reject();
                        } else {
                            throw err;
                        }
                    });
            },
            reset() {
                form.resetFields();
            },
            clear() {
                form.setFieldsValue(emptyValues);
            },
        }));

        return (
            <Form
                form={form}
                initialValues={_initialValues}
                labelCol={{ sm: 5 }}
                className="user-invite-form"
                style={style}
                disabled={disabled}
                preserve={false}
            >
                <Form.Item name="first_name" label="First Name">
                    <Input />
                </Form.Item>
                <Form.Item name="last_name" label="Last Name">
                    <Input />
                </Form.Item>
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        {
                            required: true,
                            type: "email",
                            message: "Please provide a valid email",
                        },
                    ]}
                    required
                >
                    <Input type="email" />
                </Form.Item>
                <Form.Item name="role" label="Role" required>
                    <Select
                        options={[
                            {
                                label: "Client",
                                value: UserRole.Client,
                            },
                            {
                                label: "Staff",
                                value: UserRole.Staff,
                            },
                            {
                                label: "Admin",
                                value: UserRole.Admin,
                            },
                            {
                                label: "Owner",
                                value: UserRole.Owner,
                                disabled: !isOwner,
                            },
                        ]}
                        dropdownMatchSelectWidth={false}
                    />
                </Form.Item>
                <Form.Item
                    name="expiration_time"
                    label="Expiration"
                    rules={[
                        {
                            validator: (_, val) =>
                                dayjs()
                                    .add(5, "minutes")
                                    .isAfter(val, "minutes")
                                    ? Promise.reject()
                                    : Promise.resolve(),
                            message: "Invalid expiration time",
                        },
                    ]}
                >
                    <Input type="datetime-local" />
                </Form.Item>
                <Form.Item name="initial_forms" label="Initial Forms">
                    <Form.List name="initial_forms">
                        {(fields, { add, remove }, { errors }) => (
                            <List
                                footer={
                                    <>
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={() => add()}
                                        >
                                            Add
                                        </Button>
                                        <Form.ErrorList errors={errors} />
                                    </>
                                }
                                dataSource={fields}
                                renderItem={({ key, ...field }, index) => (
                                    <List.Item
                                        key={key}
                                        actions={[
                                            <Button
                                                icon={<CloseOutlined />}
                                                type="text"
                                                title="Remove"
                                                size="small"
                                                onClick={() => remove(index)}
                                            />,
                                        ]}
                                        style={{ paddingTop: 0 }}
                                    >
                                        <Form.Item {...field} noStyle>
                                            <Select
                                                options={forms?.map((info) => ({
                                                    label: info.name,
                                                    value: info.id,
                                                }))}
                                                loading={formsLoading}
                                                notFoundContent={
                                                    formsLoading ? (
                                                        <LoadingIndicator />
                                                    ) : (
                                                        <p>No Forms</p>
                                                    )
                                                }
                                            />
                                        </Form.Item>
                                    </List.Item>
                                )}
                                split={false}
                                className="initial-forms-list"
                            >
                                {fields.length === 0 && (
                                    <List.Item
                                        key="empty"
                                        style={{ marginLeft: "24px" }}
                                    >
                                        <div>None</div>
                                    </List.Item>
                                )}
                            </List>
                        )}
                    </Form.List>
                </Form.Item>
            </Form>
        );
    }
);
export default UserInviteForm;
