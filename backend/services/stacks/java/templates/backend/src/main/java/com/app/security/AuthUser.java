package com.app.security;

import com.fasterxml.jackson.annotation.JsonProperty;

/** The logged-in user. Controllers receive it through @AuthenticationPrincipal. */
public record AuthUser(@JsonProperty("_id") String id, String name, String email) {
}
