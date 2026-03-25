import { CloseOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button, Col, Input, InputRef, Modal, Row } from "antd";
import api from "api";
import { User } from "hooks/useCurrentUser";
import { useDebounce } from "hooks/useDebounce";
import { useEffect, useRef, useState } from "react";
import UserList from "./Users/UserList";

type UserSearchProps = {
    open: boolean;
    debounceTime?: number;
    onClose: (user?: User) => void;
};

export default function UserSearchModal({
    open,
    debounceTime = 500,
    onClose,
}: UserSearchProps) {
    const searchInputRef = useRef<InputRef>(null);
    const [searchStr, setSearchStr] = useState<string>("");
    const debouncedSearch = useDebounce(searchStr, debounceTime);
    const { data: results, isPending } = useQuery({
        queryKey: ["/users", { search: debouncedSearch }],
        queryFn: async () => {
            if (!debouncedSearch || debouncedSearch.length < 3) {
                return [];
            }
            return api
                .get<User[]>(
                    `/auth/users/?is_active=True&search=${encodeURIComponent(
                        debouncedSearch
                    )}`
                )
                .then((res) => res.data);
        },
        staleTime: debounceTime,
        placeholderData: keepPreviousData,
    });

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            });
        }
    }, [open]);

    return (
        <Modal
            open={open}
            onCancel={() => onClose()}
            footer={null}
            closable={false}
            bodyStyle={{
                padding: 0,
            }}
        >
            <Row>
                <Col flex="auto">
                    <Input.Search
                        size="large"
                        placeholder="Search Users..."
                        onSearch={(v) => setSearchStr(v)}
                        onChange={(e) => {
                            setSearchStr(e.target.value);
                        }}
                        value={searchStr}
                        loading={isPending}
                        ref={searchInputRef}
                        addonBefore={
                            <Button
                                icon={<CloseOutlined />}
                                type="text"
                                size="small"
                                title="Close"
                                onClick={() => onClose()}
                            />
                        }
                        allowClear
                    />
                </Col>
            </Row>
            {results && results.length > 0 ? (
                <Row
                    style={{
                        overflowY: "auto",
                        maxHeight: 300,
                        borderTop: "1px solid #f0f0f0",
                        marginTop: 10,
                    }}
                >
                    <Col flex="auto">
                        <UserList
                            users={results}
                            loading={isPending}
                            itemLayout="horizontal"
                            className="user-list"
                            onSelect={(user) => {
                                setSearchStr("");
                                onClose(user);
                            }}
                        />
                    </Col>
                </Row>
            ) : null}
        </Modal>
    );
}
