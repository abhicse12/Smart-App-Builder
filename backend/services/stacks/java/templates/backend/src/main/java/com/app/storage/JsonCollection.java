package com.app.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * A list of records stored in backend/data/&lt;name&gt;.json.
 *
 * Every record has a string "_id". Writes are atomic, so a crash can never
 * leave a half-written file. A damaged file raises an error instead of being
 * silently replaced, which would lose the data.
 */
public class JsonCollection {

    public static final Path DATA_DIR =
        Path.of(System.getenv().getOrDefault("DATA_DIR", "data"));

    // One lock for all collections: every change is read + modify + write
    private static final Object LOCK = new Object();

    private static final ObjectMapper MAPPER =
        new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

    private static final TypeReference<List<Map<String, Object>>> RECORDS =
        new TypeReference<>() {};

    private final Path path;

    public JsonCollection(String name) {
        this.path = DATA_DIR.resolve(name + ".json");
    }

    private List<Map<String, Object>> read() {
        if (!Files.exists(path)) {
            return new ArrayList<>();
        }

        try {
            return MAPPER.readValue(path.toFile(), RECORDS);
        } catch (IOException error) {
            throw new UncheckedIOException(path.getFileName() + " could not be read", error);
        }
    }

    private void write(List<Map<String, Object>> records) {
        Path temp = null;

        try {
            Files.createDirectories(DATA_DIR);
            temp = Files.createTempFile(DATA_DIR, "records", ".tmp");
            MAPPER.writeValue(temp.toFile(), records);
            Files.move(
                temp,
                path,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
        } catch (IOException error) {
            if (temp != null) {
                temp.toFile().delete();
            }

            throw new UncheckedIOException(path.getFileName() + " could not be written", error);
        }
    }

    public List<Map<String, Object>> all() {
        synchronized (LOCK) {
            return read();
        }
    }

    public List<Map<String, Object>> find(Predicate<Map<String, Object>> predicate) {
        return all().stream().filter(predicate).toList();
    }

    public Optional<Map<String, Object>> findOne(Predicate<Map<String, Object>> predicate) {
        return all().stream().filter(predicate).findFirst();
    }

    public Optional<Map<String, Object>> get(String id) {
        return findOne(record -> id.equals(record.get("_id")));
    }

    public Map<String, Object> insert(Map<String, Object> data) {
        Map<String, Object> record = new LinkedHashMap<>(data);
        record.put("_id", UUID.randomUUID().toString().replace("-", ""));

        synchronized (LOCK) {
            List<Map<String, Object>> records = read();
            records.add(record);
            write(records);
        }

        return record;
    }

    public Optional<Map<String, Object>> update(String id, Map<String, Object> changes) {
        synchronized (LOCK) {
            List<Map<String, Object>> records = read();

            for (int index = 0; index < records.size(); index++) {
                if (id.equals(records.get(index).get("_id"))) {
                    Map<String, Object> record = new LinkedHashMap<>(records.get(index));
                    record.putAll(changes);
                    record.put("_id", id);
                    records.set(index, record);
                    write(records);
                    return Optional.of(record);
                }
            }
        }

        return Optional.empty();
    }

    public boolean delete(String id) {
        synchronized (LOCK) {
            List<Map<String, Object>> records = read();

            if (!records.removeIf(record -> id.equals(record.get("_id")))) {
                return false;
            }

            write(records);
            return true;
        }
    }
}
