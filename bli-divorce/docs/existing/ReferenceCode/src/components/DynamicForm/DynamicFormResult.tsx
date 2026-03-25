import { useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import api from "api";
import { useLocationWithState } from "hooks/use-location-with-state";
import { UserRole, useCurrentUser, type User } from "hooks/useCurrentUser";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormResult } from ".";
import FormPage from "./FormPage";
import { useResult, useUpdateResultPage } from "./hooks";
import {
    ResultStatus,
    type FormResult,
    type FormSchema,
    type FormValues,
} from "./types";

export type LocationState = { pageId?: number };

interface Props {
    formSchema: FormSchema;
}

export default function DynamicFormResult({ formSchema }: Props) {
    const result = useFormResult();
    const location = useLocationWithState<LocationState>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();

    const storageKey = `lastPage_${result.id}`;
    const currentPageId = (() => {
        if (
            result.result_status === ResultStatus.NotStarted ||
            !location.state
        ) {
            return formSchema.root_page;
        }
        const last: number | null = JSON.parse(
            String(window.localStorage.getItem(storageKey))
        );
        return location.state.pageId ?? last ?? formSchema.root_page;
    })();
    useEffect(() => {
        window.localStorage.setItem(storageKey, currentPageId.toString());
        return () => window.localStorage.removeItem(storageKey);
    }, [currentPageId, storageKey]);

    const readonly = !(user && canUpdateResult(user, result));

    const saveMutation = useUpdateResultPage({
        onSuccess: (response) => {
            queryClient.invalidateQueries({
                queryKey: useResult.getKey({ id: response.data.id }),
            });
        },
    });

    const onPrevious = () => {
        message.destroy();
        navigate(-1);
    };
    const onNext = async (values: FormValues) => {
        message.destroy();
        if (!readonly) {
            try {
                await saveMutation.mutateAsync({
                    id: result.id,
                    page: currentPageId,
                    values,
                });
            } catch (e) {
                message.error("Unable to submit page!", 5);
                return Promise.reject();
            }
        }

        const response = await api.post(`/df/pages/${currentPageId}/next/`, {
            items: { ...result.items, ...(values || {}) },
        });
        if (response.data.next === null) {
            navigate("review");
        } else {
            navigate(location.pathname, {
                state: { ...location.state, pageId: response.data.next },
            });
        }
    };
    const onSave = async (values: FormValues) => {
        if (!readonly) {
            await saveMutation.mutateAsync({
                id: result.id,
                page: currentPageId,
                values,
                partial: true,
            });
            message.success("Progress Saved!");
        }
    };

    return (
        <div>
            <FormPage
                pageId={currentPageId}
                readonly={readonly}
                onPrevious={onPrevious}
                onNext={onNext}
                onSave={onSave}
                persist
            />
        </div>
    );
}

function canUpdateResult(user: User, result: FormResult) {
    // Admin can alway updates results
    if (user.role >= UserRole.Admin) return true;

    // If the user is not an Admin...
    // The result can only be edited by the owner...
    if (user.id === result.owner) {
        // ...If it is NotStarted/InProgress
        if (
            result.result_status === ResultStatus.NotStarted ||
            result.result_status === ResultStatus.InProgress
        )
            return true;
    }
    return false;
}
