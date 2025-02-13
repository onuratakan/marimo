# Copyright 2024 Marimo. All rights reserved.
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

import tornado.web

from marimo import _loggers
from marimo._ast import codegen
from marimo._server import server_utils as sessions
from marimo._server.api.status import HTTPStatus
from marimo._server.api.validated_handler import ValidatedHandler
from marimo._server.sessions import get_manager
from marimo._utils.parse_dataclass import parse_raw

LOGGER = _loggers.marimo_logger()


@dataclass
class SaveAppConfiguration:
    # partial app config
    config: Dict[str, Any]


class SaveAppConfigurationHandler(ValidatedHandler):
    """Save app configuration to session manager."""

    @sessions.requires_edit
    def post(self) -> None:
        mgr = get_manager()
        args = parse_raw(self.request.body, SaveAppConfiguration)
        mgr.update_app_config(args.config)
        # Update the file with the latest app config
        # TODO(akshayka): Only change the `app = marimo.App` line (at top level
        # of file), instead of overwriting the whole file.
        app = mgr.load_app()
        if app is not None and mgr.filename is not None:
            codes = list(app._codes())
            names = list(app._names())
            configs = list(app._configs())

            # Try to save the app under the name `mgr.filename`
            contents = codegen.generate_filecontents(
                codes, names, cell_configs=configs, config=mgr.app_config
            )
            try:
                with open(mgr.filename, "w", encoding="utf-8") as f:
                    f.write(contents)
            except Exception as e:
                raise tornado.web.HTTPError(
                    HTTPStatus.SERVER_ERROR,
                    reason="Failed to save file: {0}".format(str(e)),
                ) from e
