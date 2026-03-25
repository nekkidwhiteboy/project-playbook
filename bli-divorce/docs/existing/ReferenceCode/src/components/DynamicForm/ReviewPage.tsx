import { Button, Col, message, Row, Typography } from "antd";
import { isAxiosError } from "axios";
import LoadingIndicator from "components/LoadingIndicator";
import { useEffect, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { useResult, useSubmitResult } from "./hooks";
import ReviewTable from "./ReviewTable";
import { ResultStatus } from "./types";

export default function ReviewPage() {
    const navigate = useNavigate();
    const params = useParams();
    const [submitting, setSubmitting] = useState(false);
    const [extra, setExtra] = useState<{ [key: string]: ReactNode }>();
    const [readonly, setReadonly] = useState(false);

    const resultId = parseInt(params.resultId ?? "0");
    const { data: result, status: resultStatus } = useResult({
        variables: { id: resultId },
        staleTime: 0,
    });

    const submitMutation = useSubmitResult({
        onSuccess: (response) => {
            setExtra(undefined);
            navigate("../success", {
                state: { pageId: response.data.id },
            });
        },
        onError: (error) => {
            setSubmitting(false);
            if (isAxiosError(error)) {
                const _extra: { [key: string]: ReactNode } = {};
                for (let err of error.response?.data.errors) {
                    _extra[err.name] = (
                        <Typography.Text
                            type="danger"
                            style={{ fontWeight: 400, fontSize: 12 }}
                        >
                            {err.error}
                        </Typography.Text>
                    );
                }
                setExtra(_extra);
            }
            message.error(
                "Unable to submit result. Please go back and fix all errors.",
                10
            );
        },
    });

    const submitResult = () => {
        if (readonly) {
            navigate("/");
        } else {
            setSubmitting(true);
            submitMutation.mutate({ id: params.resultId });
        }
    };

    useEffect(() => {
        if (result) {
            setReadonly(
                result.result_status === ResultStatus.Complete ||
                    result.result_status === ResultStatus.Failed ||
                    result.result_status === ResultStatus.Locked
            );
        }
    }, [result]);

    return (
        <div style={{ maxWidth: 800 }}>
            <Helmet
                title={`Review | ${
                    result?.form.name ?? "Barrow Brown Carrington, PLLC"
                }`}
            />
            <LoadingIndicator spinning={submitting} tip="Submitting Form...">
                <Typography>
                    <Typography.Title>Review</Typography.Title>
                    {readonly ? (
                        <Typography.Paragraph>
                            Please review your answers in the table below.
                        </Typography.Paragraph>
                    ) : (
                        <>
                            <Typography.Paragraph>
                                Please review your answers in the table below.
                                If you need to make any changes, you can do so
                                by clicking on the relevant question. Once your
                                answers have been submitted, you will no longer
                                be abe to make changes.
                            </Typography.Paragraph>
                            <Typography.Paragraph>
                                <Typography.Text strong>NOTE:</Typography.Text>{" "}
                                Your answers{" "}
                                <Typography.Text strong italic>
                                    will not be submitted
                                </Typography.Text>{" "}
                                until you click the "Submit" button below.
                            </Typography.Paragraph>
                        </>
                    )}
                </Typography>

                {resultStatus === "pending" ? (
                    <LoadingIndicator />
                ) : resultStatus === "success" ? (
                    <ReviewTable
                        height="500px"
                        result={result}
                        extra={extra}
                        labelLinksEnabled
                    />
                ) : (
                    <p>Unable to load review table</p>
                )}
                <Row
                    gutter={[10, 10]}
                    style={{ marginTop: "1em" }}
                    justify="center"
                >
                    <Col xs={{ span: 24, order: 3 }} sm={{ span: 8, order: 1 }}>
                        <Button
                            type="primary"
                            onClick={() => navigate(-1)}
                            size="large"
                            disabled={submitting}
                            block
                        >
                            Previous Page
                        </Button>
                    </Col>
                    <Col xs={{ span: 24, order: 1 }} sm={{ span: 8, order: 3 }}>
                        <Button
                            type="primary"
                            size="large"
                            disabled={submitting}
                            onClick={submitResult}
                            block
                        >
                            Submit
                        </Button>
                    </Col>
                </Row>
            </LoadingIndicator>
        </div>
    );
}
