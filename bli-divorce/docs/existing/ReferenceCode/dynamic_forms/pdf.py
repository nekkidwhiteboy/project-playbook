import logging

from itertools import cycle
from fpdf import FPDF
from fpdf.errors import FPDFUnicodeEncodingException
from math import ceil

logger = logging.getLogger(__name__)

logging.getLogger("fontTools.subset").level = logging.ERROR


class PDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font_size(10)
        self.cell(0, 10, f"{self.page_no()}/{{nb}}", align="C")

    def estimate_cell_size(self, *cells, col_width=None):
        cell_width = col_width or self.epw / len(cells)
        font_width_mm = self.font_size_pt * 0.35 * 0.5
        max_cell_length = max(len(str(text)) for text in cells)
        lines_needed = ceil(max_cell_length * font_width_mm / cell_width)
        return cell_width, lines_needed * self.font_size + 4

    def table(self, items):
        fill_color = cycle([255, 220])
        for label, value in items:
            self.set_fill_color(next(fill_color))
            if type(value) is tuple:
                self._draw_row(label)
                sub_fill_color = cycle([255, 240])
                self.set_left_margin(self.l_margin + 2)
                self.set_right_margin(self.r_margin + 2)
                for group in value:
                    self.set_fill_color(next(sub_fill_color))
                    for row in group:
                        self._draw_row(*row, border="")
                self.set_left_margin(self.l_margin - 2)
                self.set_right_margin(self.r_margin - 2)
            else:
                self._draw_row(label, value)

    def _draw_row(self, *cells, border="T"):
        cell_width, cell_height = self.estimate_cell_size(*cells)

        if self.will_page_break(cell_height):
            self.add_page()

        self.set_font(style="B")
        for text in cells:
            try:
                self.multi_cell(
                    cell_width,
                    cell_height,
                    text,
                    align="L",
                    border=border,
                    fill=True,
                    new_x="RIGHT",
                    new_y="TOP",
                    max_line_height=self.font_size,
                )
            except FPDFUnicodeEncodingException as e:
                # Try to replace unsupported chars with an xml char refs
                try:
                    text = text.encode("latin-1", "xmlcharrefreplace").decode("latin-1")
                    self.multi_cell(
                        cell_width,
                        cell_height,
                        text,
                        align="L",
                        border=border,
                        fill=True,
                        new_x="RIGHT",
                        new_y="TOP",
                        max_line_height=self.font_size,
                    )
                    logger.warning(e)
                except:
                    # Unable to replace, re-raise original error
                    raise e from None

            self.set_font(style="")
        self.ln(cell_height)
