import { Editor } from "@tinymce/tinymce-react";

interface EmailEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    height?: number | string;
}

const plugins =
    "quickbars table image link lists media preview fullscreen code visualchars";
const toolbar =
    "undo redo | blocks | bold italic | alignleft aligncenter alignright | indent outdent | bullist numlist";

export default function EmailEditor({
    value,
    onChange,
    height = 250,
}: EmailEditorProps) {
    return (
        <Editor
            apiKey={process.env.REACT_APP_TINY_MCE_KEY}
            init={{
                browser_spellcheck: true,
                height,
                plugins,
                toolbar,
            }}
            value={value}
            onEditorChange={(value) => onChange?.(value)}
        />
    );
}
