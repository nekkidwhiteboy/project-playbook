import { LoadingOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Spin, Typography, message } from "antd";
import FormItem from "antd/lib/form/FormItem";
import { Formik, type FormikErrors, type FormikHelpers } from "formik";
import { Form, Input, SubmitButton } from "formik-antd";
import { useLocationWithState } from "hooks/use-location-with-state";
import { useCurrentUser, useLogin } from "hooks/useCurrentUser";
import { Helmet } from "react-helmet-async";
import { useIdleTimer } from "react-idle-timer";
import { Link, Navigate } from "react-router-dom";
import { isValidEmail } from "util/functions";

import "./Login.less";

interface LoginValues {
    email: string;
    password: string;
}

export default function Login() {
    const { start } = useIdleTimer();
    const { status } = useCurrentUser();
    const login = useLogin({
        onSuccess: () => {
            start();
        },
    });
    const location = useLocationWithState<any>();

    const onSubmit = async (
        values: LoginValues,
        formikHelpers: FormikHelpers<LoginValues>
    ) => {
        message.destroy();
        await login.mutateAsync(
            {
                username: values.email.toLowerCase(),
                password: values.password,
            },
            {
                onError: (error) => {
                    formikHelpers.setSubmitting(false);
                    if (error.response) {
                        if (error.response.status === 400) {
                            formikHelpers.setErrors({
                                password: "Invalid email/password!",
                            });
                            formikHelpers.setFieldValue("password", "");
                        } else if (error.response.status === 403) {
                            if (
                                error.response.data.error ===
                                "Maximum amount of tokens allowed per user exceeded."
                            ) {
                                formikHelpers.setErrors({
                                    password:
                                        "Active device limit reached, unable to login.",
                                });
                            } else {
                                formikHelpers.setErrors({
                                    password: `
                                This account has been locked due too many failed attempts. 
                                Please wait ${
                                    error.response.data.cooloff_time / 60
                                } 
                                minutes before trying again.`,
                                });
                            }
                        } else {
                            message.error(
                                `Sorry! An error occurred! (Code: ${error.response.status})`,
                                10
                            );
                        }
                    }
                },
            }
        );
    };

    const validateForm = (values: LoginValues): FormikErrors<LoginValues> => {
        const errors: FormikErrors<LoginValues> = {};

        if (!values.email || !isValidEmail(values.email)) {
            errors.email = "Please enter a valid email.";
        }

        if (!values.password) {
            errors.password = "Please enter a password.";
        }

        return errors;
    };

    if (status === "success") {
        const { from = "/", ...state } = location.state ?? {};
        return <Navigate to={from} state={state} replace />;
    }

    return (
        <div className="main-content auth-container" style={{ maxWidth: 350 }}>
            <Helmet title="Login | Barrow Brown Carrington, PLLC" />
            <Formik<LoginValues>
                initialValues={{ email: "", password: "" }}
                onSubmit={onSubmit}
                validate={validateForm}
            >
                {({ isSubmitting }) => (
                    <Form noValidate layout="vertical">
                        <Spin
                            spinning={isSubmitting}
                            tip="Loading..."
                            indicator={
                                <LoadingOutlined
                                    style={{ fontSize: 24 }}
                                    spin
                                />
                            }
                        >
                            <Typography.Title>Login</Typography.Title>
                            <Form.Item name="email">
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
                            <Form.Item
                                name="password"
                                extra={
                                    <Link
                                        to="/forgot_password"
                                        state={location.state}
                                    >
                                        Forgot password?
                                    </Link>
                                }
                            >
                                <Input.Password
                                    name="password"
                                    prefix={
                                        <LockOutlined className="site-form-item-icon" />
                                    }
                                    placeholder="Password"
                                    required
                                />
                            </Form.Item>
                            <FormItem
                                extra={
                                    <Typography.Text>
                                        Or{" "}
                                        <Link
                                            to="/register"
                                            state={location.state}
                                        >
                                            register now
                                        </Link>
                                        !
                                    </Typography.Text>
                                }
                            >
                                <SubmitButton type="primary" block>
                                    Log In
                                </SubmitButton>
                            </FormItem>
                        </Spin>
                    </Form>
                )}
            </Formik>
        </div>
    );
}
