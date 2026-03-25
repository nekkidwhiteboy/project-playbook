import { Button, Result } from "antd";
import type { ResultStatusType } from "antd/lib/result";
import axios from "axios";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export default function ErrorElement() {
    const error = useRouteError();
    if (axios.isAxiosError(error) && error.response) {
        return (
            <div
                className="main-content"
                style={{ maxWidth: 850, overflow: "auto", flex: 1 }}
            >
                <Result
                    status={getStatus(error)}
                    title={`${error.response.status} - ${error.response.statusText}`}
                    subTitle={error.response.data.detail}
                    extra={
                        <Link to="/">
                            <Button type="primary">Back Home</Button>
                        </Link>
                    }
                />
            </div>
        );
    }

    if (isRouteErrorResponse(error)) {
        return (
            <div
                className="main-content"
                style={{ maxWidth: 850, overflow: "auto", flex: 1 }}
            >
                <Result
                    status={
                        ([403, 404, 500] as const).find((n) => error.status) ??
                        "error"
                    }
                    title={`${error.status} - ${error.statusText}`}
                    subTitle={error.data}
                    extra={
                        <Link to="/">
                            <Button type="primary">Back Home</Button>
                        </Link>
                    }
                />
            </div>
        );
    }
    throw error;
}

function getStatus(error: any): ResultStatusType {
    if (
        axios.isAxiosError(error) &&
        error.response &&
        [403, 404, 500].includes(error.response.status)
    ) {
        return error.response.status.toString() as ResultStatusType;
    }
    return "error";
}
