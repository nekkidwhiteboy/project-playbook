import LoadingIndicator from "components/LoadingIndicator";
import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import "./DynamicForm.less";
import DynamicFormResult from "./DynamicFormResult";
import { useFormSchema, useResult } from "./hooks";
import type { FormResult } from "./types";

const FormResultContext = createContext<FormResult | null>(null);

export default function DynamicForm() {
    const params = useParams();
    const resultId = parseInt(params.resultId ?? "0");

    const { data: result, isSuccess: resultLoaded } = useResult({
        variables: { id: resultId },
    });

    const { data: schema, isSuccess: schemaLoaded } = useFormSchema({
        variables: { id: result?.form.id },
    });

    if (resultLoaded && schemaLoaded) {
        return (
            <FormResultContext.Provider value={result}>
                <DynamicFormResult formSchema={schema} />
            </FormResultContext.Provider>
        );
    }
    return <LoadingIndicator />;
}

export function useFormResult(): FormResult {
    return useContext(FormResultContext)!;
}
