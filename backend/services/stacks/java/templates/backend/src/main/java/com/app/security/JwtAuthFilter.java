package com.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Logs the request in when it has a valid Bearer token. Without one the
 * request continues anonymously and SecurityConfig decides what it may reach.
 * Created by SecurityConfig, not as a bean, so it runs only in the security chain.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final UserAccounts accounts;

    public JwtAuthFilter(JwtService jwtService, UserAccounts accounts) {
        this.jwtService = jwtService;
        this.accounts = accounts;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain chain
    ) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(BEARER)) {
            // A deleted account's token stops working right away
            jwtService
                .readUserId(header.substring(BEARER.length()))
                .flatMap(accounts::findPublicById)
                .ifPresent(user ->
                    SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(user, null, List.of())
                    )
                );
        }

        chain.doFilter(request, response);
    }
}
