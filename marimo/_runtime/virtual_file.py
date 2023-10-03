# Copyright 2023 Marimo. All rights reserved.
from __future__ import annotations

import dataclasses
import io
from typing import TYPE_CHECKING, Callable

from marimo._runtime.cell_lifecycle_item import CellLifecycleItem

if TYPE_CHECKING:
    from marimo._runtime.context import RuntimeContext


@dataclasses.dataclass
class VirtualFile:
    url: str
    filename: str

    def __init__(self, filename: str) -> None:
        self.filename = filename
        # TODO: pass session_id as query param
        self.url = f"/@file/{filename}"


class VirtualFileLifecycleItem(CellLifecycleItem):
    def __init__(
        self, filename: str, mimetype: str, to_stream: Callable[[], io.BytesIO]
    ) -> None:
        self.filename = filename
        self.mimetype = mimetype
        self.to_stream = to_stream

    def create(self, context: "RuntimeContext") -> None:
        context.virtual_file_registry.add(
            self.filename, self.to_virtual_file()
        )

    def dispose(self, context: "RuntimeContext") -> None:
        context.virtual_file_registry.remove(self.filename)

    def to_virtual_file(self) -> VirtualFile:
        return VirtualFile(self.filename)


@dataclasses.dataclass
class VirtualFileRegistry:
    registry: dict[str, VirtualFile] = dataclasses.field(default_factory=dict)

    def add(self, virtual_file: VirtualFile) -> None:
        self.registry[virtual_file.filename] = virtual_file

    def get(self, filename: str) -> VirtualFile:
        if filename not in self.registry:
            raise FileNotFoundError(filename)
        return self.registry[filename]

    def remove(self, filename: str) -> None:
        if filename in self.registry:
            del self.registry[filename]
