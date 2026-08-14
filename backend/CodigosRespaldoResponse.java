package com.hackathon.analisis.dto;

import java.util.List;

/**
 * Codigos de respaldo de 2FA.
 *
 * ⚠️ Es la UNICA vez que se ven en claro: en la base solo queda su hash, asi
 * que no hay ningun endpoint que los relea. Si el usuario los pierde, se
 * regeneran (y los anteriores dejan de valer).
 */
public record CodigosRespaldoResponse(List<String> codigosRespaldo) {}
