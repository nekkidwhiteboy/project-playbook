import { PlusOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Col, Input, Row, Space } from "antd";
import ResultTable from "components/ResultTable";
import { useCurrentRole } from "hooks/useCurrentUser";
import { useContext, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { useCreateResult, useResults } from "./DynamicForm/hooks";
import UserSearchModal from "./UserSearchModal";
import { SelectedFormContext } from "./SelectedForm";

export default function ResultManager() {
    const selectedForm = useContext(SelectedFormContext);
    const { isAdmin, isStaff } = useCurrentRole();
    const queryClient = useQueryClient();

    const [search, setSearch] = useSearchParams();
    const [showUserSearchModal, setShowUserSearchModal] = useState(false);

    const newResultMutation = useCreateResult({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: useResults.getKey() }),
    });

    const [searchVal, setSearchVal] = useState(search.get("search") ?? "");

    return (
        <Space direction="vertical" style={{ display: "flex" }}>
            <Helmet
                title={`Results | ${
                    selectedForm?.name ?? ""
                } | Barrow Brown Carrington, PLLC`}
            />
            <Row>
                <Col flex="auto">
                    <Input.Search
                        placeholder="Search..."
                        allowClear
                        onSearch={(newSearch) => {
                            if (newSearch === "") {
                                search.delete("search");
                            } else {
                                search.set("search", newSearch);
                            }
                            setSearch(search);
                        }}
                        style={{ maxWidth: 400 }}
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                    />
                </Col>
                {isAdmin ? (
                    <Col>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => setShowUserSearchModal(true)}
                        >
                            New Result
                        </Button>
                        <UserSearchModal
                            open={showUserSearchModal}
                            onClose={(user) => {
                                if (user && selectedForm) {
                                    newResultMutation.mutate({
                                        owner: user.id,
                                        form: selectedForm.id,
                                    });
                                }
                                setShowUserSearchModal(false);
                            }}
                        />
                    </Col>
                ) : isStaff &&
                  selectedForm &&
                  (selectedForm.max_results_per_staff ?? true) ? (
                    <Col>
                        <Link to={`/new/${selectedForm.slug}`}>
                            <Button icon={<PlusOutlined />}>New Result</Button>
                        </Link>
                    </Col>
                ) : null}
            </Row>
            <ResultTable
                formId={selectedForm?.id}
                search={search.get("search") ?? undefined}
            />
        </Space>
    );
}
