import { LoadingOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Col, Row, Spin, Tooltip, Typography } from "antd";
import FormItem from "antd/lib/form/FormItem";
import { Formik, type FormikErrors, type FormikHelpers } from "formik";
import { Checkbox, Form, Input, SubmitButton } from "formik-antd";
import { useCurrentUser, useRegister } from "hooks/useCurrentUser";
import { Helmet } from "react-helmet-async";
import { useIdleTimer } from "react-idle-timer";
import { Link, Navigate, useLocation } from "react-router-dom";
import { isValidEmail, isValidPassword } from "util/functions";

import "./Login.less";

interface RegisterValues {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirm: string;
    agree_to_terms: boolean;
}

const initialValues: RegisterValues = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirm: "",
    agree_to_terms: true,
};

export default function Register() {
    const { start } = useIdleTimer();
    const { isSuccess } = useCurrentUser();
    const register = useRegister({
        onSuccess: () => {
            start();
        },
    });

    const location: any = useLocation();

    const onSubmit = async (
        values: RegisterValues,
        { setErrors }: FormikHelpers<RegisterValues>
    ) => {
        await register.mutateAsync(
            {
                email: values.email.toLowerCase(),
                password: values.password,
                first_name: values.first_name,
                last_name: values.last_name,
            },
            {
                onError: (error) => {
                    if (error.response) {
                        setErrors({
                            email: error.response.data.email?.[0],
                            password: error.response.data.password?.[0],
                        });
                    } else {
                        throw error;
                    }
                },
            }
        );
    };
    const validateForm = (
        values: RegisterValues
    ): FormikErrors<RegisterValues> => {
        const errors: FormikErrors<RegisterValues> = {};

        if (!values.first_name) {
            errors.first_name = "This field is required.";
        }
        if (!values.last_name) {
            errors.last_name = "This field is required.";
        }

        if (!values.email || !isValidEmail(values.email)) {
            errors.email = "Please enter a valid email.";
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

    if (isSuccess) {
        const { from = "/", ...state } = location.state ?? {};
        return <Navigate to={from} state={state} replace />;
    }

    return (
        <div className="main-content auth-container" style={{ maxWidth: 420 }}>
            <Helmet title="Register | Barrow Brown Carrington, PLLC" />
            <Formik<RegisterValues>
                initialValues={initialValues}
                onSubmit={onSubmit}
                validate={validateForm}
            >
                {({ isSubmitting }) => (
                    <Form noValidate>
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
                            <h1>Register</h1>
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
                                    placeholder="Email"
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
                            <FormItem
                                extra={
                                    <Typography.Text>
                                        Already have an account?{" "}
                                        <Link
                                            to="/login"
                                            state={location.state}
                                        >
                                            Login
                                        </Link>
                                    </Typography.Text>
                                }
                            >
                                <SubmitButton type="primary" block>
                                    Register
                                </SubmitButton>
                            </FormItem>
                        </Spin>
                    </Form>
                )}
            </Formik>
        </div>
    );
}
