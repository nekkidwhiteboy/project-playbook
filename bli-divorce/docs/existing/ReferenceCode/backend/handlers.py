from logging import FileHandler
import os


class MakeFileHandler(FileHandler):
    """Extension of builtin logging.FileHandler.

    Creates parent directory(s) of filename, if they don't exist.
    """

    def __init__(
        self,
        filename,
        mode: str = "a",
        encoding: str | None = None,
        delay: bool = False,
        errors: str | None = None,
    ) -> None:
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        super().__init__(filename, mode, encoding, delay, errors)
