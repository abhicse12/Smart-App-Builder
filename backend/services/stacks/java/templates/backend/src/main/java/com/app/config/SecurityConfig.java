package com.app.config;

import com.app.security.JwtAuthFilter;
import com.app.security.JwtService;
import com.app.security.UserAccounts;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Every route needs a login unless it is listed here. Tokens travel in a
    // header, not a cookie, so CSRF protection and sessions are not needed.
    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        JwtService jwtService,
        UserAccounts accounts
    ) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(requests -> requests
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/health", "/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) ->
                    writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Please log in to continue")
                )
                .accessDeniedHandler((request, response, error) ->
                    writeError(response, HttpServletResponse.SC_FORBIDDEN, "You are not allowed to do this")
                )
            )
            .addFilterBefore(
                new JwtAuthFilter(jwtService, accounts),
                UsernamePasswordAuthenticationFilter.class
            )
            .build();
    }

    private static void writeError(HttpServletResponse response, int status, String message)
        throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
