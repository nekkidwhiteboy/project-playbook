import { useEffect, useRef } from "react";
import { useParams, useSubmit } from "react-router-dom";
import LoadingIndicator from "./LoadingIndicator";

export default function Component() {
    const { slug } = useParams();
    const submit = useSubmit();
    const submitted = useRef(false);

    useEffect(() => {
        if (slug && !submitted.current) {
            submitted.current = true;
            submit(
                { slug },
                {
                    method: "post",
                    action: "/results",
                    encType: "application/json",
                    replace: true,
                }
            );
        }
    });

    return <LoadingIndicator />;
}
