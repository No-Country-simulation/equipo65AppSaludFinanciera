package com.fintechvital.api.dto;

/**
 * Respuesta de POST /auth/2fa/iniciar.
 *
 * El QR lo dibuja el frontend a partir de `otpauthUri` (ya tiene su propio
 * codificador). El `secreto` va aparte para poder ofrecer el alta manual, que
 * es la unica salida cuando la camara no lee el codigo.
 */
public record Iniciar2faResponse(String secreto, String otpauthUri) {}
