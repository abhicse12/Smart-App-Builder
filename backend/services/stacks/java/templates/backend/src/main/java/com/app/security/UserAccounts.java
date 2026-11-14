package com.app.security;

import com.app.storage.JsonCollection;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** The only code that touches backend/data/users.json. */
@Service
public class UserAccounts {

    private final JsonCollection users = new JsonCollection("users");

    public Optional<Map<String, Object>> findByEmail(String email) {
        return users.findOne(user -> email.equals(user.get("email")));
    }

    public Optional<AuthUser> findPublicById(String id) {
        return users.get(id).map(UserAccounts::toAuthUser);
    }

    public Map<String, Object> create(String name, String email, String passwordHash) {
        return users.insert(Map.of("name", name, "email", email, "password", passwordHash));
    }

    public static AuthUser toAuthUser(Map<String, Object> user) {
        return new AuthUser(
            (String) user.get("_id"),
            (String) user.get("name"),
            (String) user.get("email")
        );
    }
}
