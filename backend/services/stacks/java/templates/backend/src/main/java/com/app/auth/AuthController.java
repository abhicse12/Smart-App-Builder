package com.app.auth;

import com.app.errors.ApiException;
import com.app.security.AuthUser;
import com.app.security.JwtService;
import com.app.security.UserAccounts;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;

    // BCrypt uses at most 72 bytes of a password
    private static final int MAX_PASSWORD_BYTES = 72;

    // The duplicate-email check and the insert must happen as one step
    private final Object signupLock = new Object();

    private final UserAccounts accounts;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final String dummyHash;

    public AuthController(
        UserAccounts accounts,
        JwtService jwtService,
        PasswordEncoder passwordEncoder
    ) {
        this.accounts = accounts;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        // Checked when the email is unknown, so both cases take the same time
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }

    private static boolean fitsBcrypt(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length <= MAX_PASSWORD_BYTES;
    }

    private Map<String, Object> session(AuthUser user) {
        return Map.of("token", jwtService.createToken(user.id()), "user", user);
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> signup(@RequestBody SignupRequest body) {
        String name = body.name() == null ? "" : body.name().strip();
        String email = normalizeEmail(body.email());
        String password = body.password() == null ? "" : body.password();

        if (name.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name is required");
        }

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid email address");
        }

        if (password.length() < MIN_PASSWORD_LENGTH || !fitsBcrypt(password)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "Password must be between " + MIN_PASSWORD_LENGTH + " and " + MAX_PASSWORD_BYTES + " characters"
            );
        }

        String passwordHash = passwordEncoder.encode(password);

        synchronized (signupLock) {
            if (accounts.findByEmail(email).isPresent()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "An account with this email already exists");
            }

            return session(UserAccounts.toAuthUser(accounts.create(name, email, passwordHash)));
        }
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest body) {
        Optional<Map<String, Object>> user = accounts.findByEmail(normalizeEmail(body.email()));
        String password = body.password() == null ? "" : body.password();
        String storedHash = user.map(record -> (String) record.get("password")).orElse(dummyHash);

        boolean passwordOk = fitsBcrypt(password) && passwordEncoder.matches(password, storedHash);

        if (user.isEmpty() || !passwordOk) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return session(UserAccounts.toAuthUser(user.get()));
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal AuthUser user) {
        return Map.of("user", user);
    }
}
