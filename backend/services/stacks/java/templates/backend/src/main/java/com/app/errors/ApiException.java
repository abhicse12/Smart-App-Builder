package com.app.errors;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** throw new ApiException(HttpStatus.NOT_FOUND, "Task not found") sends { "message": ... }. */
public class ApiException extends ResponseStatusException {

    public ApiException(HttpStatus status, String message) {
        super(status, message);
    }
}
