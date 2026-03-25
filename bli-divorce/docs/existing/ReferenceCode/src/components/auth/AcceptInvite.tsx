import { InfoCircleOutlined, UserOutlined } from "@ant-design/icons";
import LockOutlined from "@ant-design/icons/lib/icons/LockOutlined";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Col, Row, Tooltip, Typography, message } from "antd";
import FormItem from "antd/lib/form/FormItem";
import { AUTH_TOKEN_KEY } from "api";
import { isAxiosError } from "axios";
import LoadingIndicator from "components/LoadingIndicator";
import {
    useAcceptUserInvite,
    useUserInviteFromToken,
} from "components/Users/hooks";
import { Formik, FormikErrors, FormikHelpers } from "formik";
import { Checkbox, Form, Input, SubmitButton } from "formik-antd";
import { CURRENT_USER_KEY } from "hooks/useCurrentUser";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isValidPassword } from "util/functions";

import "./Login.less";

const ERROR_MESSAGE_KEY = "accept_invite_error_msg";

interface AcceptInviteValues {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirm: string;
    agree_to_terms: boolean;
}

export default function AcceptInvite() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const { data, status } = useUserInviteFromToken({ variables: { token } });
    const acceptUserInvite = useAcceptUserInvite({
        onSuccess: async (data) => {
            window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            queryClient.setQueryData(CURRENT_USER_KEY, data.user);
            return navigate("/", { replace: true });
        },
    });

    const onSubmit = async (
        values: AcceptInviteValues,
        { setErrors }: FormikHelpers<AcceptInviteValues>
    ) => {
        if (!token || status !== "success") return Promise.reject();

        message.destroy(ERROR_MESSAGE_KEY);
        return acceptUserInvite.mutateAsync(
            {
                first_name: values.first_name,
                last_name: values.last_name,
                password: values.password,
                token,
            },
            {
                onError: (error) => {
                    if (isAxiosError(error) && error.response) {
                        setErrors({
                            first_name: error.response.data.first_name,
                            last_name: error.response.data.last_name,
                            password: error.response.data.password,
                        });
                    } else {
                        message.error({
                            content: "Unable to create account!",
                            key: ERROR_MESSAGE_KEY,
                            duration: 10, // 10 seconds
                        });
                    }
                },
            }
        );
    };

    const validateForm = (
        values: AcceptInviteValues
    ): FormikErrors<AcceptInviteValues> => {
        const errors: FormikErrors<AcceptInviteValues> = {};

        if (!values.first_name) {
            errors.first_name = "This field is required.";
        }
        if (!values.last_name) {
            errors.last_name = "This field is required.";
        }

        if (!values.email || values.email !== data?.email) {
            errors.email =
                "The email associated with this invitation cannot be changed.";
        }

        if (!values.password) {
            errors.password = "Please enter a password.";
        } else if (!isValidPassword(values.password)) {
            errors.password = "Password does not meet requirements.";
        } else if (values.password !== values.password_confirm) {
            errors.password_confirm = "Passwords do not match.";
        }

        if (!values.password_confirm) {
            errors.password_confirm = "Please confirm password.";
        }

        if (!values.agree_to_terms) {
            errors.agree_to_terms =
                "You must agree in order to register. If you have questions or concerns about our policies, please call us at 502-589-9353.";
        }
        return errors;
    };

    return (
        <div className="main-content auth-container" style={{ maxWidth: 400 }}>
            {status === "pending" ? (
                <LoadingIndicator spinning />
            ) : status === "error" ? (
                <Typography>
                    <Typography.Title>Invalid Invitation</Typography.Title>
                    <Typography.Paragraph>
                        Please contact the system administrator to request a new
                        invitation.
                    </Typography.Paragraph>
                    <Link to="/" replace>
                        <Button type="primary" block>
                            Return Home
                        </Button>
                    </Link>
                </Typography>
            ) : (
                <Formik<AcceptInviteValues>
                    initialValues={{
                        first_name: data.first_name,
                        last_name: data.last_name,
                        email: data.email,
                        password: "",
                        password_confirm: "",
                        agree_to_terms: true,
                    }}
                    onSubmit={onSubmit}
                    validate={validateForm}
                >
                    {({ isSubmitting }) => (
                        <Form noValidate>
                            <LoadingIndicator
                                spinning={isSubmitting}
                                tip="Loading..."
                            >
                                <h1>Create Account</h1>
                                <Row gutter={[10, 0]}>
                                    <Col flex="auto">
                                        <Form.Item
                                            name="first_name"
                                            hasFeedback={false}
                                            required
                                        >
                                            <Input
                                                name="first_name"
                                                placeholder="First Name"
                                                autoComplete="given-name"
                                                required
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col flex="auto">
                                        <Form.Item
                                            name="last_name"
                                            hasFeedback={false}
                                            required
                                        >
                                            <Input
                                                name="last_name"
                                                placeholder="Last Name"
                                                autoComplete="family-name"
                                                required
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="email" required>
                                    <Input
                                        name="email"
                                        type="email"
                                        prefix={
                                            <UserOutlined className="site-form-item-icon" />
                                        }
                                        suffix={
                                            <Tooltip title="The email associated with this invite cannot be changed.">
                                                <InfoCircleOutlined
                                                    style={{
                                                        color: "rgba(0,0,0,.45)",
                                                    }}
                                                />
                                            </Tooltip>
                                        }
                                        readOnly
                                        required
                                    />
                                </Form.Item>
                                <Form.Item name="password">
                                    <Tooltip
                                        trigger={"focus"}
                                        title="Must be at least 8 characters long, and contain an uppercase letter, lowercase letter, number, and symbol."
                                        placement="bottomLeft"
                                    >
                                        <Input.Password
                                            name="password"
                                            prefix={
                                                <LockOutlined className="site-form-item-icon" />
                                            }
                                            placeholder="Password"
                                            autoComplete="new-password"
                                            required
                                        />
                                    </Tooltip>
                                </Form.Item>
                                <Form.Item name="password_confirm">
                                    <Input.Password
                                        name="password_confirm"
                                        prefix={
                                            <LockOutlined className="site-form-item-icon" />
                                        }
                                        placeholder="Confirm Password"
                                        autoComplete="new-password"
                                        required
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="agree_to_terms"
                                    valuePropName="checked"
                                >
                                    <Checkbox name="agree_to_terms">
                                        I agree to the{" "}
                                        <Link to="/terms-and-conditions">
                                            terms &amp; conditions
                                        </Link>{" "}
                                        as well as the{" "}
                                        <Link to="/privacy-policy">
                                            privacy policy
                                        </Link>
                                        .
                                    </Checkbox>
                                </Form.Item>
                                <FormItem>
                                    <SubmitButton type="primary" block>
                                        Create Account
                                    </SubmitButton>
                                </FormItem>
                            </LoadingIndicator>
                        </Form>
                    )}
                </Formik>
            )}
        </div>
    );
}
