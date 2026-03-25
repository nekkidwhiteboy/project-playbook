import LockOutlined from "@ant-design/icons/lib/icons/LockOutlined";
import { Button, Space, Tooltip, Typography } from "antd";
import api from "api";
import axios from "axios";
import { Formik, FormikErrors, FormikHelpers } from "formik";
import { Form, Input, SubmitButton } from "formik-antd";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { isValidPassword } from "util/functions";

interface ResetPasswordValues {
    password: string;
    passwordConfirm: string;
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(null);
    const [validToken, setValidToken] = useState(false);
    const [passwordWasReset, setPasswordWasReset] = useState(false);

    const onSubmit = async (
        { password }: ResetPasswordValues,
        { setErrors }: FormikHelpers<ResetPasswordValues>
    ) => {
        if (token && validToken) {
            try {
                await api.post("/auth/reset_password/confirm/", {
                    password,
                    token,
                });
                setPasswordWasReset(true);
            } catch (error) {
                if (axios.isAxiosError(error) && error.response) {
                    if (error.response.status === 404) {
                        setValidToken(false);
                    } else {
                        setErrors({
                            password:
                                error.response.data.password[0] ??
                                "Unable to reset password",
                        });
                    }
                }
            }
        }
    };
    const validateForm = (
        values: ResetPasswordValues
    ): FormikErrors<ResetPasswordValues> => {
        const errors: FormikErrors<ResetPasswordValues> = {};

        if (!values.password) {
            errors.password = "Please enter a password.";
        } else if (!isValidPassword(values.password)) {
            errors.password = "Password does not meet requirements.";
        } else if (values.password !== values.passwordConfirm) {
            errors.passwordConfirm = "Passwords do not match.";
        }
        if (!values.passwordConfirm) {
            errors.passwordConfirm = "Please confirm password.";
        }

        return errors;
    };

    useEffect(() => {
        let active = true;
        const _token = searchParams.get("token");
        if (_token === null) {
            setToken(null);
            setValidToken(false);
        } else {
            validateToken(_token).then((isValid) => {
                if (active) {
                    setValidToken(isValid);
                }
            });
            setToken(_token);
        }
        return () => {
            active = false;
        };
    }, [searchParams]);

    return (
        <div className="main-content auth-container" style={{ maxWidth: 400 }}>
            <Helmet title="Reset Password | Barrow Brown Carrington, PLLC" />
            <Formik<ResetPasswordValues>
                initialValues={{
                    password: "",
                    passwordConfirm: "",
                }}
                onSubmit={onSubmit}
                validate={validateForm}
            >
                <Form noValidate>
                    {passwordWasReset ? (
                        <>
                            <Space
                                direction="vertical"
                                align="center"
                                style={{ display: "flex" }}
                            >
                                <Typography.Title>Success!</Typography.Title>
                                <Typography.Text>
                                    Password was successfully changed.
                                </Typography.Text>
                                <Link to="/login" replace>
                                    <Button type="primary">Log In</Button>
                                </Link>
                            </Space>
                        </>
                    ) : (
                        <>
                            <Typography.Title>Reset Password</Typography.Title>
                            {validToken ? (
                                <>
                                    <Form.Item name="password">
                                        <Tooltip
                                            trigger="focus"
                                            title="Must be at least 8 characters long, and contain an uppercase letter, lowercase letter, number, and symbol."
                                            placement="bottomLeft"
                                        >
                                            <Input.Password
                                                name="password"
                                                prefix={
                                                    <LockOutlined className="site-form-item-icon" />
                                                }
                                                placeholder="Password"
                                                required
                                            />
                                        </Tooltip>
                                    </Form.Item>
                                    <Form.Item name="passwordConfirm">
                                        <Input.Password
                                            name="passwordConfirm"
                                            prefix={
                                                <LockOutlined className="site-form-item-icon" />
                                            }
                                            placeholder="Confirm Password"
                                            required
                                        />
                                    </Form.Item>
                                    <SubmitButton type="primary" block>
                                        Reset Password
                                    </SubmitButton>
                                </>
                            ) : (
                                <>
                                    <Typography.Paragraph>
                                        Error! Your reset token is either
                                        missing or expired.
                                    </Typography.Paragraph>
                                    <Link to="/forgot_password" replace>
                                        <Button type="primary" block>
                                            Request New Token
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </Form>
            </Formik>
        </div>
    );
}

async function validateToken(token: string) {
    return api
        .post("auth/reset_password/validate_token/", {
            token,
        })
        .then(() => true)
        .catch(() => false);
}
