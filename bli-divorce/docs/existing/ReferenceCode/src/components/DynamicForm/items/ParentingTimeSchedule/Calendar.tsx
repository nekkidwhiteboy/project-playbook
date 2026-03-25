import { useCallback, type FC } from "react";
import {
    isParentingPeriod,
    type NullableProps,
    type ParentingPeriod,
} from "./types";

import { getDate, getMinutes } from "./util";

const BORDER_SIZE = 2;
const CELL_PROPS = {
    HEIGHT: 78,
    WIDTH: 104,
    PADDING_TOP: 6,
    PADDING_BOTTOM: 6,
    PADDING_LEFT: 4,
    PADDING_RIGHT: 4,
};
const DAYS = ["Mon", "Tue", "Wed", "Thr", "Fri", "Sat", "Sun"];
const HEADER_FONT = "bold 1.3em Arial";
const LABEL_FONT = "bolder .85em Arial";
const LINE_SPACING = 4;
const OFFSET = 30;

interface Props {
    periods: NullableProps<ParentingPeriod>[];
    petColor?: CanvasFillStrokeStyles["fillStyle"];
    respColor?: CanvasFillStrokeStyles["fillStyle"];
    numWeeks?: number;
    secondaryPeriods?: ParentingPeriod[];
    secondaryStyle?: CanvasFillStrokeStyles["fillStyle"];
    defaultTime?: string | ((day: [number, number]) => string);
}

const Calendar: FC<Props> = (props) => {
    const canvasRef = useCallback(
        (node: HTMLCanvasElement | null) => {
            if (!node) return;

            const {
                periods = [],
                petColor = "#FF6666",
                respColor = "#6666FF",
                numWeeks = 2,
                secondaryPeriods = [],
                secondaryStyle = "#FFFFFF",
                defaultTime = "12:00",
            } = props;

            const context: CanvasRenderingContext2D = node.getContext("2d")!;

            context.canvas.width =
                (CELL_PROPS.WIDTH + BORDER_SIZE) * 7 + BORDER_SIZE;
            context.canvas.height =
                (CELL_PROPS.HEIGHT + BORDER_SIZE) * numWeeks +
                BORDER_SIZE / 2 +
                OFFSET;

            context.fillStyle = respColor;
            context.fillRect(
                0,
                OFFSET,
                context.canvas.width,
                context.canvas.height
            );
            let empty = true;
            for (let period of periods) {
                if (isParentingPeriod(period)) {
                    drawPeriod(
                        context,
                        period.StartDay,
                        getMinutes(
                            period.StartTime ??
                                (typeof defaultTime === "function"
                                    ? defaultTime(period.StartDay)
                                    : defaultTime)
                        ),
                        period.EndDay,
                        getMinutes(
                            period.EndTime ??
                                (typeof defaultTime === "function"
                                    ? defaultTime(period.EndDay)
                                    : defaultTime)
                        ),
                        petColor,
                        numWeeks
                    );
                    empty = false;
                }
            }

            for (let period of secondaryPeriods) {
                drawPeriod(
                    context,
                    period.StartDay,
                    getMinutes(
                        period.StartTime ??
                            (typeof defaultTime === "function"
                                ? defaultTime(period.StartDay)
                                : defaultTime)
                    ),
                    period.EndDay,
                    getMinutes(
                        period.EndTime ??
                            (typeof defaultTime === "function"
                                ? defaultTime(period.EndDay)
                                : defaultTime)
                    ),
                    secondaryStyle,
                    numWeeks
                );
            }
            if (empty) {
                context.clearRect(
                    0,
                    0,
                    context.canvas.width,
                    context.canvas.height
                );
            }

            drawHeader(context);
            drawCellBorders(context, numWeeks);

            drawTimes(context, periods, numWeeks);
        },
        [props]
    );

    return (
        <canvas
            ref={canvasRef}
            style={{ width: "100%", display: "block" }}
        ></canvas>
    );
};
export default Calendar;

function drawPeriod(
    context: CanvasRenderingContext2D,
    [startWeek, startDay]: [number, number],
    startTime: number,
    [endWeek, endDay]: [number, number],
    endTime: number,
    color: CanvasFillStrokeStyles["fillStyle"],
    numWeeks: number = 2
) {
    const startOffset =
        (BORDER_SIZE + CELL_PROPS.WIDTH) * startDay +
        (startTime / 1440) * CELL_PROPS.WIDTH +
        BORDER_SIZE;
    const endOffset =
        (BORDER_SIZE + CELL_PROPS.WIDTH) * endDay +
        (endTime / 1440) * CELL_PROPS.WIDTH +
        BORDER_SIZE;

    context.fillStyle = color;

    const wraps =
        endWeek * 7 + endDay < startWeek * 7 + startDay ||
        (endWeek === startWeek && endDay === startDay && endTime < startTime);

    for (let i = startWeek; i <= endWeek + (wraps ? numWeeks : 0); i++) {
        let row = i % numWeeks;
        let y =
            OFFSET + (BORDER_SIZE + CELL_PROPS.HEIGHT) * row + BORDER_SIZE / 2;
        if (startWeek === endWeek && !wraps) {
            const w = endOffset - startOffset;
            context.fillRect(startOffset, y, w, CELL_PROPS.HEIGHT);
            break;
        }
        if (row === startWeek) {
            const w = context.canvas.width - startOffset;
            context.fillRect(startOffset, y, w, CELL_PROPS.HEIGHT);
        }
        if (row === endWeek) {
            context.fillRect(0, y, endOffset, CELL_PROPS.HEIGHT);
        }
        if (row !== endWeek && row !== startWeek) {
            context.fillRect(0, y, context.canvas.width, CELL_PROPS.HEIGHT);
        }
    }
}

function drawTimes(
    context: CanvasRenderingContext2D,
    periods: NullableProps<ParentingPeriod>[],
    numWeeks: number = 2
) {
    const usedHeightPerDay: number[][] = Array.from(
        { length: numWeeks },
        () => new Array(7)
    );
    for (let period of periods) {
        if (isParentingPeriod(period)) {
            context.fillStyle = "#000000";
            context.font = LABEL_FONT;

            if (period.StartTime !== null) {
                drawTime(getMinutes(period.StartTime), period.StartDay);
            }
            if (period.EndTime !== null) {
                drawTime(getMinutes(period.EndTime), period.EndDay);
            }
        }
    }
    function drawTime(time: number, [week, day]: [number, number]) {
        const LEFT_EDGE = (BORDER_SIZE + CELL_PROPS.WIDTH) * day + BORDER_SIZE;
        const RIGHT_EDGE =
            (BORDER_SIZE + CELL_PROPS.WIDTH) * (day + 1) -
            CELL_PROPS.PADDING_RIGHT;
        const TOP_EDGE = OFFSET + (BORDER_SIZE + CELL_PROPS.HEIGHT) * week;

        const xOffset =
            BORDER_SIZE +
            (BORDER_SIZE + CELL_PROPS.WIDTH) * day +
            (time / 1440) * CELL_PROPS.WIDTH;
        const yOffset =
            usedHeightPerDay[week][day] ??
            TOP_EDGE + BORDER_SIZE / 2 + CELL_PROPS.PADDING_TOP;

        const timeStr = getDate(time).format("h:mm A");
        const metrics = context.measureText(timeStr);
        const textWidth = metrics.width;
        const textHeight =
            metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        let x = xOffset;
        // Prevent right-edge overflow
        if (x + textWidth / 2 > RIGHT_EDGE) {
            x = RIGHT_EDGE - textWidth / 2;
        }
        // Prevent left-edge overflow
        if (x - textWidth / 2 < LEFT_EDGE) {
            x = LEFT_EDGE + textWidth / 2;
        }

        let y = yOffset;
        // Prevent bottom-edge overflow
        if (
            y >
            TOP_EDGE +
                CELL_PROPS.HEIGHT -
                BORDER_SIZE -
                CELL_PROPS.PADDING_BOTTOM
        ) {
            y = TOP_EDGE + BORDER_SIZE / 2 + CELL_PROPS.PADDING_TOP;
        }

        context.fillText(timeStr, x - textWidth / 2, y + textHeight);
        usedHeightPerDay[week][day] = y + textHeight + LINE_SPACING;
    }
}

function drawHeader(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000000";
    ctx.font = HEADER_FONT;
    for (let [i, day] of DAYS.entries()) {
        const metrics = ctx.measureText(day);
        ctx.fillText(
            day,
            (BORDER_SIZE + CELL_PROPS.WIDTH) * i +
                Math.floor(BORDER_SIZE / 2) +
                (CELL_PROPS.WIDTH - metrics.width) / 2,
            OFFSET - 10
        );
    }
}

function drawCellBorders(ctx: CanvasRenderingContext2D, numWeeks: number) {
    ctx.lineWidth = BORDER_SIZE;

    // Draw column borders
    let x = BORDER_SIZE / 2;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x, OFFSET);
        ctx.lineTo(x, ctx.canvas.height);
        ctx.stroke();
        x += CELL_PROPS.WIDTH + BORDER_SIZE;
    }

    // Draw row borders
    let y = OFFSET;
    for (let i = 0; i <= numWeeks; i++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();
        y += CELL_PROPS.HEIGHT + BORDER_SIZE;
    }
}
