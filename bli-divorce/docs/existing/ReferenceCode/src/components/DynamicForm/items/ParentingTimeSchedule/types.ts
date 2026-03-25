export type NullableProps<T extends {}> = {
    [K in keyof T]: T[K] | null;
};

export type Interval = [number, number];

export type ParentingPeriod = {
    StartDay: [number, number];
    StartTime: string | null;
    EndDay: [number, number];
    EndTime: string | null;
};

export function isParentingPeriod(period: any): period is ParentingPeriod {
    return (
        Array.isArray(period.StartDay) &&
        Array.isArray(period.EndDay) &&
        (typeof period.StartTime === "string" || period.StartTime === null) &&
        (typeof period.EndTime === "string" || period.EndTime === null) &&
        period.StartDay.length === 2 &&
        period.EndDay.length === 2 &&
        period.StartDay.every((d: any) => typeof d === "number") &&
        period.StartDay.every((d: any) => typeof d === "number")
    );
}
