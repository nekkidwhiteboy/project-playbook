import { Divider, Typography } from "antd";
import HtmlMapper from "react-html-map";

interface HtmlMarkupProps {
    allowHTML: boolean;
    text: string;
    tagMap: {
        [key: string]: (props: any) => JSX.Element;
    };
}

export const HtmlMarkup = ({
    allowHTML,
    text,
    tagMap,
    ...props
}: HtmlMarkupProps) => {
    const _tagMap = allowHTML ? tagMap : {};
    return (
        <Typography>
            <HtmlMapper html={text} decodeEntities={null}>
                {_tagMap}
            </HtmlMapper>
        </Typography>
    );
};
HtmlMarkup.defaultProps = {
    allowHTML: true,
    tagMap: {
        p: ({ style, children, ...props }: any) => (
            <Typography.Paragraph style={JSON.parse(style || "{}")} {...props}>
                {children}
            </Typography.Paragraph>
        ),
        h1: ({ style, children, ...props }: any) => (
            <Typography.Title
                level={1}
                style={JSON.parse(style || "{}")}
                {...props}
            >
                {children}
            </Typography.Title>
        ),
        h2: ({ style, children, ...props }: any) => (
            <Typography.Title
                level={2}
                style={JSON.parse(style || "{}")}
                {...props}
            >
                {children}
            </Typography.Title>
        ),
        h3: ({ style, children, ...props }: any) => (
            <Typography.Title
                level={3}
                style={JSON.parse(style || "{}")}
                {...props}
            >
                {children}
            </Typography.Title>
        ),
        h4: ({ style, children, ...props }: any) => (
            <Typography.Title
                level={4}
                style={JSON.parse(style || "{}")}
                {...props}
            >
                {children}
            </Typography.Title>
        ),
        h5: ({ style, children, ...props }: any) => (
            <Typography.Title
                level={5}
                style={JSON.parse(style || "{}")}
                {...props}
            >
                {children}
            </Typography.Title>
        ),
        hgroup: (props: any) => <hgroup {...props} />,
        br: () => <br />,
        strong: (props: any) => (
            <Typography.Text strong>{props.children}</Typography.Text>
        ),
        b: (props: any) => (
            <Typography.Text strong>{props.children}</Typography.Text>
        ),
        em: (props: any) => (
            <Typography.Text italic>{props.children}</Typography.Text>
        ),
        i: (props: any) => (
            <Typography.Text italic>{props.children}</Typography.Text>
        ),
        sub: (props: any) => <sub {...props} />,
        sup: (props: any) => <sup {...props} />,
        ul: (props: any) => <ul>{props.children}</ul>,
        li: (props: any) => <li>{props.children}</li>,
        hr: ({ style }: any) => (
            <Divider style={{ marginTop: 0, ...JSON.parse(style || "{}") }} />
        ),
        wbr: () => <wbr />,
        youtube: ({ id, width, title }: any) => (
            <div
                style={{
                    maxWidth: `${width || 560}px`,
                    margin: "0px auto 10px",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        paddingBottom: "60%",
                        height: 0,
                    }}
                >
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}`}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                        }}
                        title={title || "YouTube Video"}
                        className="yt-video"
                        frameBorder="0"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        ),
    },
};
