import { UserOutlined } from "@ant-design/icons";
import { Button, Divider, message, Space, Typography } from "antd";
import FormItem from "antd/lib/form/FormItem";
import api from "api";
import axios from "axios";
import { Formik, type FormikErrors, type FormikHelpers } from "formik";
import { Form, Input, SubmitButton } from "formik-antd";
import { useCurrentUser } from "hooks/useCurrentUser";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useLocation } from "react-router-dom";
import { isValidEmail } from "util/functions";

import "./Login.less";

interface ForgotPasswordValues {
    email: string;
}

const MESSAGE_POPUP_KEY = "email_error";
const ForgotPassword = (): JSX.Element => {
    const { isSuccess } = useCurrentUser();
    const location: any = useLocation();

    const [emailSent, setEmailSent] = useState(false);

    const onSubmit = async (
        { email }: ForgotPasswordValues,
        { setErrors }: FormikHelpers<ForgotPasswordValues>
    ) => {
        message.destroy(MESSAGE_POPUP_KEY);
        try {
            await api.post("/auth/reset_password/", {
                email: email.toLowerCase(),
            });
            setEmailSent(true);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 400) {
                setErrors({ email: "Invalid Email." });
            } else {
                setEmailSent(false);
                message.error({
                    content: "Unable to send password reset email",
                    duration: 0,
                    key: MESSAGE_POPUP_KEY,
                });
            }
        }
    };

    const validateForm = (
        values: ForgotPasswordValues
    ): FormikErrors<ForgotPasswordValues> => {
        const errors: FormikErrors<ForgotPasswordValues> = {};

        if (!values.email || !isValidEmail(values.email)) {
            errors.email = "Please enter a valid email.";
        }

        return errors;
    };

    useEffect(() => () => message.destroy(MESSAGE_POPUP_KEY), []);

    if (isSuccess) {
        return <Navigate to={location.state?.from || "/"} replace />;
    }

    return (
        <div className="main-content auth-container" style={{ maxWidth: 400 }}>
            <Helmet title="Forgot Password | Barrow Brown Carrington, PLLC" />
            <Formik<ForgotPasswordValues>
                initialValues={{ email: "" }}
                onSubmit={onSubmit}
                validate={validateForm}
            >
                {({ values, submitForm }) => (
                    <Form noValidate>
                        <Typography.Title>Forgot Password</Typography.Title>
                        {emailSent ? (
                            <Space direction="vertical">
                                <Typography.Text>
                                    Instructions to reset your password have
                                    been sent to{" "}
                                    <Typography.Text strong>
                                        {values.email}
                                    </Typography.Text>
                                    .
                                </Typography.Text>
                                <Typography.Text>
                                    Please allow up to 10 minutes for the email
                                    to arrive.
                                </Typography.Text>
                                <Typography.Text>
                                    Didn't receive the email?{" "}
                                    <Button
                                        type="link"
                                        onClick={submitForm}
                                        style={{ padding: 0 }}
                                    >
                                        Resend it
                                    </Button>
                                    .
                                </Typography.Text>
                                <Link to="/login" replace>
                                    <Button type="primary" block>
                                        Log In
                                    </Button>
                                </Link>
                            </Space>
                        ) : (
                            <>
                                <Typography.Paragraph>
                                    Enter the email associated with your account
                                    and we'll send you a link to reset your
                                    password.
                                </Typography.Paragraph>
                                <Form.Item name="email" required>
                                    <Input
                                        name="email"
                                        type="email"
                                        prefix={
                                            <UserOutlined className="site-form-item-icon" />
                                        }
                                        placeholder="Email"
                                        required
                                    />
                                </Form.Item>
                                <FormItem
                                    extra={
                                        <Typography.Text>
                                            <Link to="/login" replace>
                                                Login
                                            </Link>{" "}
                                            or{" "}
                                            <Link to="/register" replace>
                                                Register
                                            </Link>
                                        </Typography.Text>
                                    }
                                >
                                    <SubmitButton type="primary" block>
                                        Submit
                                    </SubmitButton>
                                </FormItem>
                            </>
                        )}
                    </Form>
                )}
            </Formik>
            <Divider />
            <Typography.Paragraph style={{ textAlign: "center" }}>
                Still having issues logging in?
                <br />
                Email{" "}
                <Typography.Link href="mailto:supportteam@bbc.law?subject=Login%20Issue">
                    supportteam@bbc.law
                </Typography.Link>{" "}
                for further assistance.
            </Typography.Paragraph>
        </div>
    );
};

export default ForgotPassword;
