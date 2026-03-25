import type { FC, ReactNode } from "react";

export const Label: FC<{ children: ReactNode }> = ({ children }) => (
    <>
        {children}
        <span className="required-mark">*</span>
    </>
);
