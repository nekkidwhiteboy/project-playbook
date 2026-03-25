import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
    isParentingPeriod,
    type Interval,
    type NullableProps,
    type ParentingPeriod,
} from "./types";

dayjs.extend(customParseFormat);

export const MIDNIGHT = dayjs().startOf("day");

export function getMinutes(date: Dayjs): number;
export function getMinutes(date: null): null;
export function getMinutes(date: string, format?: string): number;
export function getMinutes(date: string | Dayjs | null): number | null;
export function getMinutes(date: string | Dayjs | null, format = "HH:mm") {
    if (date === null) return null;
    date = dayjs(date, format);
    return date.hour() * 60 + date.minute();
}

export function getDate(minutes: number): Dayjs;
export function getDate(minutes: null): null;
export function getDate(minutes: number | null): Dayjs | null;
export function getDate(minutes: number | null) {
    return minutes === null || isNaN(minutes)
        ? null
        : MIDNIGHT.add(minutes, "minute");
}

export function parsePtsString(ptsString: string): ParentingPeriod[] | null {
    if (ptsString === "" || ptsString === "*") {
        return null;
    }
    const periods: ParentingPeriod[] = [];
    const periodStrings = ptsString.split(";");

    for (let p of periodStrings) {
        if (p === "") continue;
        let [StartDay, StartTime, EndDay, EndTime] = p
            .split(/[-:]/)
            .map((n) => parseInt(n, 16));
        periods.push({
            StartDay: [Math.floor(StartDay / 7), StartDay % 7],
            StartTime: getDate(StartTime)?.format("HH:mm") ?? null,
            EndDay: [Math.floor(EndDay / 7), EndDay % 7],
            EndTime: getDate(EndTime)?.format("HH:mm") ?? null,
        });
    }

    return periods;
}

export function toPtsString(
    periods: NullableProps<ParentingPeriod>[] | null
): string {
    let ptsString = "";
    for (let period of periods ?? []) {
        if (isParentingPeriod(period)) {
            ptsString +=
                (period.StartDay[0] * 7 + period.StartDay[1]).toString(16) +
                ":" +
                (getMinutes(period.StartTime)?.toString(16) ?? "") +
                "-" +
                (period.EndDay[0] * 7 + period.EndDay[1]).toString(16) +
                ":" +
                (getMinutes(period.EndTime)?.toString(16) ?? "") +
                ";";
        }
    }
    return ptsString;
}

export function intersection(
    [l1, r1]: Interval,
    [l2, r2]: Interval
): Interval | null {
    if (r1 < l2 || r2 < l1) return null;
    return [Math.max(l1, l2), Math.min(r1, r2)];
}

export function circIntersections(
    [l1, r1]: Interval,
    [l2, r2]: Interval
): Interval[] {
    let res: (Interval | null)[] = [];

    if (r1 < l1) {
        if (r2 < l2) {
            return [[Math.max(l1, l2), Math.min(r1, r2)]];
        }
        res.push(intersection([0, r1], [l2, r2]));
        res.push(intersection([l1, 360], [l2, r2]));
    } else if (r2 < l2) {
        res.push(intersection([l1, r1], [0, r2]));
        res.push(intersection([l1, r1], [l2, 360]));
    } else {
        res.push(intersection([l1, r1], [l2, r2]));
    }

    return res.filter((int) => int !== null) as Interval[];
}

const MINUTES_IN_DAY = 1440; // 60 * 24

export function toInterval(period: ParentingPeriod, numWeeks = 2): Interval {
    const RADIUS = (MINUTES_IN_DAY * 7 * numWeeks) / (2 * Math.PI);

    const startOffset =
        MINUTES_IN_DAY * 7 * period.StartDay[0] +
        MINUTES_IN_DAY * period.StartDay[1] +
        (getMinutes(period.StartTime) ?? 0);

    const endOffset =
        MINUTES_IN_DAY * 7 * period.EndDay[0] +
        MINUTES_IN_DAY * period.EndDay[1] +
        (getMinutes(period.EndTime) ?? 0);

    const startAngle = startOffset / (Math.PI / 180) / RADIUS;
    const endAngle = endOffset / (Math.PI / 180) / RADIUS;

    return [startAngle, endAngle];
}

export function toParentingPeriod(
    [startAngle, endAngle]: Interval,
    numWeeks = 2
): ParentingPeriod {
    const RADIUS = (MINUTES_IN_DAY * 7 * numWeeks) / (2 * Math.PI);

    const startOffset = startAngle * (Math.PI / 180) * RADIUS;
    const endOffset = endAngle * (Math.PI / 180) * RADIUS;

    const startWeek = Math.floor(startOffset / (MINUTES_IN_DAY * 7));
    const endWeek = Math.floor(endOffset / (MINUTES_IN_DAY * 7));

    const startDay = Math.floor(
        (startOffset % (MINUTES_IN_DAY * 7)) / MINUTES_IN_DAY
    );
    const endDay = Math.floor(
        (endOffset % (MINUTES_IN_DAY * 7)) / MINUTES_IN_DAY
    );

    const startTime = getDate(startOffset % MINUTES_IN_DAY).format("HH:mm");
    const endTime = getDate(endOffset % MINUTES_IN_DAY).format("HH:mm");

    return {
        StartDay: [startWeek, startDay],
        StartTime: startTime,
        EndDay: [endWeek, endDay],
        EndTime: endTime,
    };
}

/**
 * Compare function meant to be used to sort a ParentingPeriod[]
 *
 * @returns A negative value if the first argument is less than the second argument, zero if they're equal, and a positive value otherwise.
 */
export const compareIntervals = (a: ParentingPeriod, b: ParentingPeriod) =>
    (a.StartDay[0] + 1) * 7 +
    (a.StartDay[1] + 1) +
    (getMinutes(a.StartTime) ?? 0) -
    (b.StartDay[0] + 1) * 7 -
    (b.StartDay[1] + 1) -
    (getMinutes(a.StartTime) ?? 0);

/**
 * Inverts a list of ParentingPeriods.
 * Any incomplete ParentingPeriods are removed.
 * @param periods List of ParentingPeriods to invert
 * @returns A list ParentingPeriods consisting the gaps between the given list
 */
export const invertPeriods = (periods: NullableProps<ParentingPeriod>[]) =>
    periods
        .filter(isParentingPeriod)
        .toSorted(compareIntervals)
        .map((current, index, p) => ({
            StartDay: current.EndDay,
            StartTime: current.EndTime,
            EndDay: p[(index + 1) % p.length].StartDay,
            EndTime: p[(index + 1) % p.length].StartTime,
        }))
        .toSorted(compareIntervals);
