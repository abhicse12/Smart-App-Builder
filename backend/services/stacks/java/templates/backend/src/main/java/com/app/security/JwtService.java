package com.app.security;

import com.app.storage.JsonCollection;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final Duration TOKEN_LIFETIME = Duration.ofDays(7);

    private final SecretKey key = createKey(loadSecret());

    // JWT_SECRET wins. Otherwise a random secret is created once and kept, so
    // logins survive a restart.
    private static String loadSecret() {
        String configured = System.getenv("JWT_SECRET");

        if (configured != null && !configured.isBlank()) {
            return configured;
        }

        Path secretFile = JsonCollection.DATA_DIR.resolve(".env.jwt_secret");

        try {
            if (Files.exists(secretFile)) {
                return Files.readString(secretFile).trim();
            }

            byte[] random = new byte[48];
            new SecureRandom().nextBytes(random);
            String secret = Base64.getEncoder().encodeToString(random);

            Files.createDirectories(JsonCollection.DATA_DIR);
            Files.writeString(secretFile, secret);

            return secret;
        } catch (IOException error) {
            throw new UncheckedIOException("The JWT secret could not be loaded", error);
        }
    }

    // Hashing gives a valid HS256 key for a secret of any length
    private static SecretKey createKey(String secret) {
        try {
            return Keys.hmacShaKeyFor(
                MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }

    public String createToken(String userId) {
        Instant now = Instant.now();

        return Jwts.builder()
            .subject(userId)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(TOKEN_LIFETIME)))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    /** The user id of a valid token, otherwise empty. */
    public Optional<String> readUserId(String token) {
        try {
            return Optional.ofNullable(
                Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject()
            );
        } catch (JwtException | IllegalArgumentException error) {
            return Optional.empty();
        }
    }
}
