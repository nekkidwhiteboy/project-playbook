import api from "api";
import { createMutation } from "react-query-kit";
import type { EmailAction } from "./types";

export const useUpdateEmailAction = createMutation({
    mutationFn: (vars: { id: number; values: Partial<EmailAction> }) => {
        return api.patch<EmailAction>(
            `/df/submit_actions/email/${vars.id}/`,
            vars.values
        );
    },
});

export const useCreateEmailAction = createMutation({
    mutationFn: (vars: { values: Omit<EmailAction, "id"> }) => {
        return api.post<EmailAction>(`/df/submit_actions/email/`, vars.values);
    },
});
export const useDeleteEmailAction = createMutation({
    mutationFn: (vars: { id: number }) =>
        api.delete(`/df/submit_actions/email/${vars.id}/`),
});
