import os
import random

from fastapi.testclient import TestClient

from marimo._server.sessions import get_manager
from marimo._server2.main import app
from marimo._server2.models.models import CellConfig, SaveRequest
from marimo._server2.tests.mocks import get_mock_session_manager

app.dependency_overrides[get_manager] = get_mock_session_manager


def test_directory_autocomplete(client: TestClient) -> None:
    response = client.post(
        "/api/kernel/directory_autocomplete",
        json={
            "prefix": "",
        },
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/json"
    assert len(response.json()["directories"]) > 0


def test_rename(client: TestClient) -> None:
    current_filename = get_mock_session_manager().filename

    assert current_filename
    assert os.path.exists(current_filename)

    directory = os.path.dirname(current_filename)
    random_name = random.randint(0, 100000)
    new_filename = f"{directory}/test_{random_name}.py"

    response = client.post(
        "/api/kernel/rename",
        json={
            "filename": new_filename,
        },
    )
    assert response.json() == {"success": True}

    assert os.path.exists(new_filename)
    assert not os.path.exists(current_filename)


def test_read_code(client: TestClient) -> None:
    response = client.post(
        "/api/kernel/read_code",
        json={},
    )
    assert response.status_code == 200, response.text
    assert response.json()["contents"].startswith("import marimo")


def test_save_file(client: TestClient) -> None:
    filename = get_mock_session_manager().filename
    assert filename

    response = client.post(
        "/api/kernel/save",
        json={
            "filename": filename,
            "codes": ["import marimo as mo"],
            "names": ["my_cell"],
            "configs": [
                {
                    "hide_code": True,
                    "disabled": False,
                }
            ],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["success"] is True
    file_contents = open(filename).read()
    assert "import marimo as mo" in file_contents
    assert "@app.cell(hide_code=True)" in file_contents


def test_save_file_cannot_rename(client: TestClient) -> None:
    response = client.post(
        "/api/kernel/save",
        json=SaveRequest(
            filename="random_filename.py",
            codes=["import marimo as mo"],
            names=["my_cell"],
            configs=[
                CellConfig(
                    hide_code=True,
                    disabled=False,
                )
            ],
        ).dict(),
    )
    assert response.status_code == 400
    assert "cannot rename" in response.text
