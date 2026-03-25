from datetime import time
from math import pi
from typing import Dict, List, Tuple
from re import split

MINUTES_IN_DAY = 1440  # 60 * 24


class CircInterval:
    def __init__(self, start: int | float, end: int | float):
        self.start = start % 360
        self.end = end % 360

    @classmethod
    def from_parenting_period(cls, period: "ParentingPeriod", num_weeks=2):
        radius = (MINUTES_IN_DAY * 7 * num_weeks) / (2 * pi)

        start_time = time.fromisoformat(period.StartTime or "00:00")
        end_time = time.fromisoformat(period.EndTime or "00:00")

        start_offset = (
            MINUTES_IN_DAY * 7 * period.StartDay[0]
            + MINUTES_IN_DAY * period.StartDay[1]
            + start_time.hour * 60
            + start_time.minute
        )
        end_offset = (
            MINUTES_IN_DAY * 7 * period.EndDay[0]
            + MINUTES_IN_DAY * period.EndDay[1]
            + end_time.hour * 60
            + end_time.minute
        )

        start_angle = start_offset / radius
        end_angle = end_offset / radius

        return cls(start_angle, end_angle)

    @classmethod
    def from_dict(cls, period: Dict[str, Tuple | str], num_weeks=2):
        return cls.from_parenting_period(ParentingPeriod(**period, num_weeks=num_weeks))

    def __getitem__(self, index):
        return (self.start, self.end)[index]

    def __and__(self, other: "CircInterval") -> List["CircInterval"]:
        l1, r1 = self
        l2, r2 = other

        res = []
        if r1 < l1:  # self wraps
            if r2 < l2:  # other also wraps
                res.append((max(l1, l2), min(r1, r2)))
            else:
                res.append(intersection((0, r1), (l2, r2)))
                res.append(intersection((l1, 360), (l2, r2)))
        elif r2 < l2:
            res.append(intersection((l1, r1), (0, r2)))
            res.append(intersection((l1, r1), (l2, 360)))
        else:
            res.append(intersection((l1, r1), (l2, r2)))

        return [CircInterval(*i) for i in res if i is not None]

    intersections = __and__

    def __str__(self):
        return f"[{self.start}, {self.end}]"

    __repr__ = __str__


Interval = Tuple[int | float, int | float]


def intersection(i1: Interval, i2: Interval) -> Interval | None:
    l1, r1 = i1
    l2, r2 = i2

    if r1 < l2 or r2 < l1:
        return None

    return max(l1, l2), min(r1, r2)


class ParentingPeriod:
    def __init__(self, *args, **kwargs):
        _data = dict(*args, **kwargs)

        self.StartDay = _data.get("StartDay", (None, None))
        self.StartTime = _data.get("StartTime")
        self.EndDay = _data.get("EndDay", (None, None))
        self.EndTime = _data.get("EndTime")

    @classmethod
    def from_interval(cls, interval: Interval | CircInterval, num_weeks=2):
        start_angle, end_angle = interval

        radius = (MINUTES_IN_DAY * 7 * num_weeks) / (2 * pi)

        start_offset = start_angle * radius
        end_offset = end_angle * radius

        start_week = start_offset // (MINUTES_IN_DAY * 7)
        end_week = end_offset // (MINUTES_IN_DAY * 7)

        start_day = start_offset % (MINUTES_IN_DAY * 7) // MINUTES_IN_DAY
        end_day = end_offset % (MINUTES_IN_DAY * 7) // MINUTES_IN_DAY

        start_hour = int(start_offset % MINUTES_IN_DAY // 60)
        start_minute = int(start_offset % MINUTES_IN_DAY % 60)
        end_hour = int(end_offset % MINUTES_IN_DAY // 60)
        end_minute = int(end_offset % MINUTES_IN_DAY % 60)

        start_time = f"{start_hour:02d}:{start_minute:02d}"
        end_time = f"{end_hour:02d}:{end_minute:02d}"

        return cls(
            StartDay=(int(start_week), int(start_day)),
            StartTime=start_time,
            EndDay=(int(end_week), int(end_day)),
            EndTime=end_time,
        )

    def __str__(self):
        return str(vars(self))

    __repr__ = __str__


def parse_pts_string(pts_string: str) -> List[ParentingPeriod]:
    periods = []

    for p in pts_string.split(";"):
        if p == "":
            continue

        start_day, start_time, end_day, end_time = [
            int(x, 16) if x else None for x in split(r"[-:]", p)
        ]

        periods.append(
            ParentingPeriod(
                StartDay=(start_day // 7, start_day % 7),
                StartTime=(
                    f"{(start_time // 60):02d}:{(start_time // 1440):02d}"
                    if start_time
                    else None
                ),
                EndDay=(end_day // 7, end_day % 7),
                EndTime=(
                    f"{(end_time // 60):02d}:{(end_time // 1440):02d}"
                    if end_time
                    else None
                ),
            ),
        )

    return periods
