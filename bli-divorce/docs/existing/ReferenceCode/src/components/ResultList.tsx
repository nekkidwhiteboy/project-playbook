import { useQueryClient } from "@tanstack/react-query";
import { Col, List, Row } from "antd";
import { useCurrentUser } from "hooks/useCurrentUser";
import { ReactNode, useCallback } from "react";
import { Link } from "react-router-dom";
import { useResetResult, useResults } from "./DynamicForm/hooks";
import { FormResult, ResultStatus } from "./DynamicForm/types";
import ExtraActions from "./ExtraActions";
import LoadingIndicator from "./LoadingIndicator";

import "./HomePage.less";

export default function ResultList() {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();

    const { data: results, isLoading } = useResults({
        variables: { owner: user?.id },
    });

    const resetMutation = useResetResult({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: useResults.getKey() }),
    });

    const getListItemActions = useCallback(
        (item: FormResult): ReactNode[] => [
            <Link to={`results/${item.id}`}>
                {item.result_status === ResultStatus.NotStarted
                    ? "Start"
                    : item.result_status === ResultStatus.InProgress
                    ? "Continue"
                    : "View"}
            </Link>,
            <ExtraActions
                actions={[
                    {
                        label: "Reset",
                        action: async () => {
                            await resetMutation.mutateAsync({ id: item.id });
                        },
                        disabled:
                            item.result_status !== ResultStatus.InProgress,
                        confirm: {
                            title: "Are you sure reset this result?",
                            content: (
                                <div>
                                    <p>
                                        This will clear <strong>all</strong> of
                                        your responses, requiring you to restart
                                        from the beginning.
                                    </p>
                                    <p>
                                        This action <strong>cannot</strong> be
                                        undone.
                                    </p>
                                </div>
                            ),
                        },
                    },
                ]}
            />,
        ],
        [resetMutation]
    );

    return (
        <LoadingIndicator spinning={isLoading}>
            <Row>
                <Col flex="auto">
                    <p>Welcome {user?.first_name}!</p>
                </Col>
            </Row>
            <List
                bordered
                className="result-list"
                dataSource={results}
                header={<div>Results</div>}
                renderItem={(item) => (
                    <List.Item key={item.id} actions={getListItemActions(item)}>
                        <List.Item.Meta
                            title={
                                <Link
                                    to={`results/${item.id}`}
                                    className="result-item-label"
                                >
                                    {item.form.name}
                                </Link>
                            }
                            description={
                                <p
                                    className={`result-status-${item.result_status.replaceAll(
                                        " ",
                                        "_"
                                    )}`}
                                >
                                    {item.result_status}
                                </p>
                            }
                        />
                    </List.Item>
                )}
            />
        </LoadingIndicator>
    );
}
