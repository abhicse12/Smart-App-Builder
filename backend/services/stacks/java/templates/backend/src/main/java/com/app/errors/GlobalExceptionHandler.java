package com.app.errors;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Every error reaches the client as { "message": "..." }. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
        Exception error,
        Object body,
        HttpHeaders headers,
        HttpStatusCode status,
        WebRequest request
    ) {
        String message =
            error instanceof ResponseStatusException statusError && statusError.getReason() != null
                ? statusError.getReason()
                : HttpStatus.valueOf(status.value()).getReasonPhrase();

        return ResponseEntity.status(status).headers(headers).body(Map.of("message", message));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
        MethodArgumentNotValidException error,
        HttpHeaders headers,
        HttpStatusCode status,
        WebRequest request
    ) {
        String message = error.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(field -> field.getField() + " " + field.getDefaultMessage())
            .orElse("Invalid request");

        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception error) {
        log.error("Unexpected error", error);

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("message", "Internal server error"));
    }
}
