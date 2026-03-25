import { Button, Result } from "antd";
import type { ResultStatusType } from "antd/lib/result";
import axios from "axios";
import React, { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

interface Props extends PropsWithChildren {}

interface State {
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: any) {
        if (error instanceof Error) {
            return { error };
        }
        return { error: Error(error) };
    }

    private getStatus = (): ResultStatusType => {
        if (
            axios.isAxiosError(this.state.error) &&
            this.state.error.response &&
            [403, 404, 500].includes(this.state.error.response.status)
        ) {
            return this.state.error.response.status.toString() as ResultStatusType;
        }
        return "error";
    };

    render() {
        const { error } = this.state;
        if (error) {
            if (axios.isAxiosError(error) && error.response) {
                return (
                    <Result
                        status={this.getStatus()}
                        title={`${error.response.status} - ${error.response.statusText}`}
                        subTitle={error.response.data.detail}
                        extra={
                            <Link to="/">
                                <Button type="primary">Back Home</Button>
                            </Link>
                        }
                    />
                );
            }
            return (
                <Result
                    status="error"
                    title="Sorry!"
                    subTitle={error.message}
                    extra={
                        <Link to="/">
                            <Button type="primary">Back Home</Button>
                        </Link>
                    }
                />
            );
        }

        return this.props.children;
    }
}
