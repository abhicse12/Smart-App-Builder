import json
import os
import tempfile
import threading
import uuid
from typing import Any, Callable

from app.core.config import DATA_DIR

# One lock for all collections: every change is read + modify + write
_lock = threading.RLock()


class JsonCollection:
    """A list of records stored in backend/data/<name>.json.

    Every record has a string "_id". Writes are atomic, so a crash can never
    leave a half-written file. A damaged file raises an error instead of being
    silently replaced, which would lose the data.
    """

    def __init__(self, name: str):
        self.path = DATA_DIR / f"{name}.json"

    def _read(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []

        with self.path.open(encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, list):
            raise ValueError(f"{self.path.name} must contain a JSON array")

        return data

    def _write(self, records: list[dict[str, Any]]) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        descriptor, temp_path = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")

        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as file:
                json.dump(records, file, indent=2, ensure_ascii=False)

            os.replace(temp_path, self.path)
        except BaseException:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise

    def all(self) -> list[dict[str, Any]]:
        with _lock:
            return self._read()

    def find(self, predicate: Callable[[dict[str, Any]], bool]) -> list[dict[str, Any]]:
        return [record for record in self.all() if predicate(record)]

    def find_one(self, predicate: Callable[[dict[str, Any]], bool]) -> dict[str, Any] | None:
        return next((record for record in self.all() if predicate(record)), None)

    def get(self, record_id: str) -> dict[str, Any] | None:
        return self.find_one(lambda record: record.get("_id") == record_id)

    def insert(self, data: dict[str, Any]) -> dict[str, Any]:
        record = {**data, "_id": uuid.uuid4().hex}

        with _lock:
            records = self._read()
            records.append(record)
            self._write(records)

        return record

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        with _lock:
            records = self._read()

            for index, record in enumerate(records):
                if record.get("_id") == record_id:
                    records[index] = {**record, **changes, "_id": record_id}
                    self._write(records)
                    return records[index]

        return None

    def delete(self, record_id: str) -> bool:
        with _lock:
            records = self._read()
            remaining = [record for record in records if record.get("_id") != record_id]

            if len(remaining) == len(records):
                return False

            self._write(remaining)
            return True
