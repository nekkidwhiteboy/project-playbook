import { useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Modal, Space, message } from "antd";
import { isAxiosError } from "axios";
import { useCallback, useRef, useState } from "react";
import UserInviteForm, {
    NewUserInvite,
    UserInvite,
    UserInviteFormRef,
} from "./UserInviteForm";
import {
    useCreateUserInvite,
    useSendUserInvite,
    useUpdateUserInvite,
    useUserInvites,
} from "./hooks";

const ERROR_MESSAGE_KEY = "user_invite_error_msg";

interface UserInviteModalProps {
    initialValues?: UserInvite;
    open: boolean;
    onOk: () => void;
    onCancel: () => void;
}

const UserInviteModal = ({
    initialValues,
    open,
    onOk,
    onCancel,
}: UserInviteModalProps) => {
    const queryClient = useQueryClient();
    const form = useRef<UserInviteFormRef>(null);
    const [sendNow, setSendNow] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createUserInvite = useCreateUserInvite({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useUserInvites.getPrimaryKey()],
            }),
    });
    const updateUserInvite = useUpdateUserInvite({
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [useUserInvites.getPrimaryKey()],
            }),
    });
    const sendUserInvite = useSendUserInvite({
        onSuccess: () =>
            queryClient
                .invalidateQueries({
                    queryKey: [useUserInvites.getPrimaryKey()],
                })
                .then(() => message.success("Invite Sent!")),
        onError: (error) => message.error(error.message),
    });

    const handleOk = useCallback(() => {
        setIsSubmitting(true);
        message.destroy(ERROR_MESSAGE_KEY);
        return form.current
            ?.submit()
            .then(() => onOk())
            .catch((err) => {
                message.error({
                    content:
                        isAxiosError(err) && err.response?.status === 403
                            ? err.response.data.detail
                            : err.message,
                    key: ERROR_MESSAGE_KEY,
                    duration: 10, // 10 seconds
                });
            })
            .finally(() => setIsSubmitting(false));
    }, [onOk]);
    const handleCancel = useCallback(
        (e: React.MouseEvent) => {
            if (isSubmitting) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            onCancel();
        },
        [isSubmitting, onCancel]
    );
    const handleFormSubmit = useCallback(
        async (values: NewUserInvite) => {
            let invite;
            if (initialValues) {
                invite = await updateUserInvite.mutateAsync({
                    id: initialValues.id,
                    values,
                });
            } else {
                invite = await createUserInvite.mutateAsync(values);
            }
            if (sendNow) {
                await sendUserInvite.mutateAsync({
                    id: invite.id,
                    resend: initialValues !== undefined,
                });
            }
            return Promise.resolve();
        },
        [
            createUserInvite,
            initialValues,
            sendUserInvite,
            sendNow,
            updateUserInvite,
        ]
    );

    return (
        <Modal
            title={initialValues ? "Edit Invite" : "New Invite"}
            open={open}
            onOk={handleOk}
            onCancel={handleCancel}
            destroyOnClose
            footer={
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <label>
                        <span style={{ marginRight: 5 }}>Send Now</span>
                        <Checkbox
                            checked={sendNow}
                            onChange={() => setSendNow((v) => !v)}
                            disabled={isSubmitting}
                        />
                    </label>
                    <Space>
                        <Button
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            danger
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleOk}
                            type="primary"
                            loading={isSubmitting}
                        >
                            {initialValues ? "Update" : "Create"}
                            {sendNow
                                ? ` & ${initialValues ? "Resend" : "Send"}`
                                : ""}
                        </Button>
                    </Space>
                </div>
            }
            bodyStyle={{ paddingBottom: 0, maxHeight: 480, overflowY: "auto" }}
        >
            <UserInviteForm
                initialValues={initialValues}
                onSubmit={handleFormSubmit}
                disabled={isSubmitting}
                ref={form}
            />
        </Modal>
    );
};
export default UserInviteModal;
