# Copyright 2024 Marimo. All rights reserved.
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List

from marimo._runtime import requests
from marimo._server import server_utils as sessions
from marimo._server.api.validated_handler import ValidatedHandler
from marimo._utils.parse_dataclass import parse_raw


@dataclass
class SetUIElementValue:
    # ids of UI elements whose values we'll set
    object_ids: List[str]
    # value of each UI element; same length as object_ids
    values: List[Any]


class SetUIElementValueHandler(ValidatedHandler):
    def post(self) -> None:
        session = sessions.require_session_from_header(self.request.headers)
        args = parse_raw(self.request.body, SetUIElementValue)
        session.control_queue.put(
            requests.SetUIElementValueRequest(
                zip(
                    args.object_ids,
                    args.values,
                )
            )
        )
