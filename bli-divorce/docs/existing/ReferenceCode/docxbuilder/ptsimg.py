from datetime import datetime, time
from pathlib import Path
from typing import Dict, List, Literal

from PIL import Image, ImageDraw, ImageFont

from dynamic_forms.interval import ParentingPeriod, parse_pts_string


FONT_DIR = Path(__file__).parent / "fonts"


class CELL:
    BORDER = 3
    FONT = ImageFont.truetype(str(FONT_DIR / "segoeuib.ttf"), size=12)
    HEIGHT = 105
    LINE_SPACING = 6
    PADDING_BOTTOM = 6
    PADDING_LEFT = 4
    PADDING_RIGHT = 4
    PADDING_TOP = 6
    WIDTH = 140

    @property
    def BORDER_CENTER(self):
        return self.BORDER / 2 - (-(1**self.BORDER) - 1) / -4


class HEADER:
    FONT = ImageFont.truetype(str(FONT_DIR / "segoeui.ttf"), size=18)
    PADDING_BOTTOM = 4
    PADDING_TOP = 4

    @property
    def USED_HEIGHT(self):
        _, top, _, bottom = self.FONT.getbbox("M", anchor="lt")
        return top + bottom + self.PADDING_TOP + self.PADDING_BOTTOM


class LEGEND:
    BOX_BORDER = 1
    BOX_NAME_SPACE = 5
    LABEL = "Legend:"
    LABEL_FONT = ImageFont.truetype(str(FONT_DIR / "segoeui.ttf"), size=14)
    LINE_SPACING = 6
    NAME_FONT = ImageFont.truetype(str(FONT_DIR / "segoeui.ttf"), size=16)
    PADDING_BOTTOM = 6
    PADDING_LEFT = 25
    PADDING_TOP = 6

    def USED_HEIGHT(self, pet_name, resp_name):
        _, label_height = _get_size(self.LABEL_FONT, self.LABEL)
        _, pet_height = _get_size(self.NAME_FONT, pet_name)
        _, resp_height = _get_size(self.NAME_FONT, resp_name)

        label = self.PADDING_TOP + label_height + self.LINE_SPACING
        box = max(pet_height, resp_height) + self.BOX_BORDER * 2
        spacing = self.LINE_SPACING + self.PADDING_BOTTOM

        return label + box * 2 + spacing


try:
    # Works on Windows only
    datetime.now().strftime("%#I:%M %p")
    DEFAULT_FORMAT = "%#I:%M %p"
except ValueError:
    try:
        # Works on Linux/OSX only
        datetime.now().strftime("%-I:%M %p")
        DEFAULT_FORMAT = "%-I:%M %p"
    except ValueError:
        DEFAULT_FORMAT = "%I:%M %p"


DAYS = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"]
MINUTES_IN_DAY = 1440

HEADER = HEADER()
CELL = CELL()
LEGEND = LEGEND()


def create_image(
    out_file: Path | str,
    periods: List[ParentingPeriod | Dict] | str,
    pet_color="#FF6666",
    resp_color="#6666FF",
    pet_name="Petitioner",
    resp_name="Respondent",
    num_weeks: int | Literal["auto"] = "auto",
    default_time="12:00",
    show_percentage=True,
):
    img = Image.new("RGB", ((CELL.WIDTH + CELL.BORDER) * 7 + CELL.BORDER, 0), "#FFFFFF")

    if type(periods) is str:
        _periods = parse_pts_string(periods)
    else:
        _periods = [
            p if type(p) is ParentingPeriod else ParentingPeriod(p) for p in periods
        ]

    if num_weeks == "auto":
        num_weeks = _calc_num_weeks(_periods)

    img = _draw_header(img)
    img = _draw_table(
        img,
        _periods,
        pet_color,
        resp_color,
        num_weeks=num_weeks,
        default_time=default_time,
    )

    pet_percentage = _calc_percentage(_periods, num_weeks, default_time)

    pet_label = pet_name + f" ({pet_percentage:.2f}%)" if show_percentage else ""
    resp_label = (
        resp_name + f" ({100 - pet_percentage:.2f}%)" if show_percentage else ""
    )

    img = _draw_legend(img, pet_label, resp_label, pet_color, resp_color)

    img.save(out_file)


def _add_height(img: Image.Image, height: int, color="#FFFFFF"):
    resized_img = Image.new("RGB", (img.width, img.height + height), color)
    resized_img.paste(img, (0, 0))
    return resized_img


def _draw_header(img: Image.Image):
    img = _add_height(img, HEADER.USED_HEIGHT)
    draw = ImageDraw.Draw(img)

    # Draw day names centered over each column
    for i, day in enumerate(DAYS):
        x = (CELL.BORDER + CELL.WIDTH) * i + CELL.BORDER + (CELL.WIDTH / 2)
        y = HEADER.PADDING_TOP
        draw.text((x, y), day, fill="#000", font=HEADER.FONT, anchor="mt")

    return img


def _draw_legend(
    img: Image.Image,
    pet_name: str,
    resp_name: str,
    pet_color: str,
    resp_color: str,
):
    legend_height = LEGEND.USED_HEIGHT(pet_name, resp_name)
    img = _add_height(img, legend_height)
    draw = ImageDraw.Draw(img)

    box = (
        max(
            _get_size(LEGEND.NAME_FONT, pet_name)[1],
            _get_size(LEGEND.NAME_FONT, resp_name)[1],
        )
        + LEGEND.BOX_BORDER * 2
    )

    # Draw the label
    x = LEGEND.PADDING_LEFT
    y = img.height - legend_height + LEGEND.PADDING_TOP
    draw.text((x, y), LEGEND.LABEL, font=LEGEND.LABEL_FONT, fill="#000", anchor="lt")

    # Draw the petitioner
    y += _get_size(LEGEND.LABEL_FONT, LEGEND.LABEL)[1] + LEGEND.LINE_SPACING
    draw.rectangle(
        (x, y, x + box, y + box),
        width=LEGEND.BOX_BORDER,
        outline="#000",
        fill=pet_color,
    )
    draw.text(
        (x + box + LEGEND.BOX_NAME_SPACE, y + box),
        pet_name,
        font=LEGEND.NAME_FONT,
        anchor="ls",
        fill="#000",
    )

    # Draw the respondent
    y += box + LEGEND.LINE_SPACING
    draw.rectangle(
        (x, y, x + box, y + box),
        width=LEGEND.BOX_BORDER,
        outline="#000",
        fill=resp_color,
    )
    draw.text(
        (x + box + LEGEND.BOX_NAME_SPACE, y + box),
        resp_name,
        font=LEGEND.NAME_FONT,
        anchor="ls",
        fill="#000",
    )

    return img


def _draw_table(
    img: Image.Image,
    periods: List[ParentingPeriod],
    pet_color: str,
    resp_color: str,
    num_weeks=2,
    default_time="12:00",
):
    table_height = (CELL.HEIGHT + CELL.BORDER) * num_weeks + CELL.BORDER

    img = _add_height(img, table_height)
    draw = ImageDraw.Draw(img)

    # Fill table area with resp_color
    draw.rectangle((0, HEADER.USED_HEIGHT, img.width, img.height), fill=resp_color)

    # Draw petitioner's periods over top
    for period in periods:
        img = _draw_period(
            img, period, pet_color, num_weeks=num_weeks, default_time=default_time
        )

    # Draw column borders
    for i in range(9):
        x = (CELL.WIDTH + CELL.BORDER) * i + CELL.BORDER_CENTER
        y0 = HEADER.USED_HEIGHT
        y1 = y0 + (CELL.HEIGHT + CELL.BORDER) * num_weeks
        draw.line((x, y0, x, y1), fill="#000", width=CELL.BORDER)

    # Draw row borders
    for i in range(num_weeks + 1):
        y = (CELL.HEIGHT + CELL.BORDER) * i + HEADER.USED_HEIGHT + CELL.BORDER_CENTER

        draw.line(
            (0, y, (CELL.WIDTH + CELL.BORDER) * 7 + CELL.BORDER, y),
            fill="#000",
            width=CELL.BORDER,
        )

    img = _draw_times(img, periods, num_weeks=num_weeks)

    return img


def _draw_period(
    img: Image.Image,
    period: ParentingPeriod,
    color: str,
    num_weeks=2,
    default_time="12:00",
):
    draw = ImageDraw.Draw(img)

    start_week, start_day = period.StartDay
    start_time = _get_minutes(period.StartTime or default_time)
    end_week, end_day = period.EndDay
    end_time = _get_minutes(period.EndTime or default_time)

    start_offset = (
        CELL.BORDER
        + (CELL.BORDER + CELL.WIDTH) * start_day
        + (start_time / MINUTES_IN_DAY) * CELL.WIDTH
    )
    end_offset = (
        CELL.BORDER
        + (CELL.BORDER + CELL.WIDTH) * end_day
        + (end_time / MINUTES_IN_DAY) * CELL.WIDTH
        - 1
    )

    wraps = (end_week * 7 + end_day < start_week * 7 + start_day) or (
        period.EndDay == period.StartDay and end_time < start_time
    )

    offset = HEADER.USED_HEIGHT

    for i in range(start_week, end_week + (num_weeks if wraps else 0) + 1):
        row = i % num_weeks
        y = offset + (CELL.BORDER + CELL.HEIGHT) * row + CELL.BORDER

        if start_week == end_week and not wraps:
            draw.rectangle((start_offset, y, end_offset, y + CELL.HEIGHT), fill=color)
            break

        if row == start_week:
            draw.rectangle((start_offset, y, img.width, y + CELL.HEIGHT), fill=color)
        if row == end_week:
            draw.rectangle((0, y, end_offset, y + CELL.HEIGHT), fill=color)
        if row != end_week and row != start_week:
            draw.rectangle((0, y, img.width, y + CELL.HEIGHT), fill=color)

    return img


def _draw_times(img: Image.Image, periods: List[ParentingPeriod], num_weeks=2):
    draw = ImageDraw.Draw(img)
    used_height_per_day = [[0] * 7 for _ in range(num_weeks)]

    def _draw_time(_time, week, day):
        if not _time:
            return

        left_edge = (CELL.BORDER + CELL.WIDTH) * day + CELL.BORDER
        right_edge = (CELL.BORDER + CELL.WIDTH) * (day + 1) - CELL.PADDING_RIGHT
        top_edge = (
            HEADER.USED_HEIGHT + (CELL.BORDER + CELL.HEIGHT) * week + CELL.BORDER_CENTER
        )

        x_offset = (
            CELL.BORDER
            + (CELL.BORDER + CELL.WIDTH) * day
            + (_get_minutes(_time) / MINUTES_IN_DAY) * CELL.WIDTH
        )
        y_offset = (
            used_height_per_day[week][day]
            or top_edge + CELL.BORDER / 2 + CELL.PADDING_TOP
        )

        time_str = time.fromisoformat(_time).strftime(DEFAULT_FORMAT)
        text_width, text_height = _get_size(CELL.FONT, time_str)

        x = x_offset

        if x + text_width / 2 > right_edge:
            x = right_edge - text_width / 2

        if x - text_width / 2 < left_edge:
            x = left_edge + text_width / 2

        y = y_offset

        if y > top_edge + CELL.HEIGHT - CELL.BORDER - CELL.PADDING_BOTTOM:
            y = top_edge + CELL.BORDER / 2 + CELL.PADDING_TOP

        draw.text((x, y), time_str, fill="#000000", font=CELL.FONT, anchor="mt")
        used_height_per_day[week][day] = y + text_height + CELL.LINE_SPACING

    for period in periods:
        _draw_time(period.StartTime, *period.StartDay)
        _draw_time(period.EndTime, *period.EndDay)

    return img


def _get_size(font: ImageFont.ImageFont, text: str):
    left, top, right, bottom = font.getbbox(text, anchor="lt")
    return (left + right, top + bottom)


def _get_minutes(date: str | datetime | time):
    if type(date) is str:
        date = time.fromisoformat(date)
    return date.hour * 60 + date.minute


def _calc_percentage(periods: List[ParentingPeriod], num_weeks=2, default_time="12:00"):
    total_minutes = 0
    for period in periods:
        StartDay = period.StartDay
        StartTime = period.StartTime
        EndDay = period.EndDay
        EndTime = period.EndTime

        if StartDay and EndDay:
            start_minutes = (
                StartDay[0] * 7 + StartDay[1]
            ) * MINUTES_IN_DAY + _get_minutes(StartTime or default_time)
            end_minutes = (EndDay[0] * 7 + EndDay[1]) * MINUTES_IN_DAY + _get_minutes(
                EndTime or default_time
            )
            total_minutes += end_minutes - start_minutes

            if start_minutes >= end_minutes:
                total_minutes += 7 * num_weeks * MINUTES_IN_DAY

    return (total_minutes / (7 * num_weeks * MINUTES_IN_DAY)) * 100


def _calc_num_weeks(periods: List[ParentingPeriod]):
    return max(max(p.StartDay[0], p.EndDay[0]) for p in periods) + 1
