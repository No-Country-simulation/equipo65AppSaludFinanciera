package com.fintechvital.api.service;

import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.Ciudad;
import com.fintechvital.api.repository.CiudadRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Catalogo de ciudades y resolucion nombre -> id.
 *
 * `usuario.ciudad_id` es una FK a este catalogo (migracion V2), pero el alta
 * recibe un NOMBRE, porque eso es lo que el contrato congelo (`ciudad?` en
 * §4.1) y lo que la persona escoge en el formulario. Aqui se traduce.
 *
 * Antes de esto, el registro recibia `ciudad` y la tiraba sin decir nada: la
 * ciudad que alguien elegia al registrarse no llegaba a la base y por eso no
 * aparecia despues en su perfil.
 */
@Service
public class CiudadService {

    private final CiudadRepository ciudades;

    public CiudadService(CiudadRepository ciudades) {
        this.ciudades = ciudades;
    }

    @Transactional(readOnly = true)
    public List<Ciudad> catalogo() {
        return ciudades.findAllByOrderByPaisAscNombreAsc();
    }

    @Transactional(readOnly = true)
    public Optional<Ciudad> porId(UUID id) {
        return id == null ? Optional.empty() : ciudades.findById(id);
    }

    /**
     * Nombre -> ciudad del catalogo. Tolerante con acentos y mayusculas
     * ("Bogotá", "bogota" y "BOGOTA" son la misma), porque el catalogo esta
     * guardado sin acentos y quien escribe su ciudad si los pone.
     *
     * Si el nombre no esta en el catalogo se responde 422 y NO se ignora: un
     * dato que la persona rellena y desaparece en silencio es peor que un
     * error. El cliente sabe que valores valen porque los sirve
     * `GET /api/v1/ciudades`.
     */
    @Transactional(readOnly = true)
    public UUID resolverId(String nombre) {
        if (nombre == null || nombre.isBlank()) return null;
        String buscado = normalizar(nombre);
        return ciudades.findAll().stream()
                .filter(c -> normalizar(c.getNombre()).equals(buscado))
                .findFirst()
                .map(Ciudad::getId)
                .orElseThrow(() -> ErrorNegocio.validacion("ciudad",
                        "no esta en el catalogo; consulta GET /api/v1/ciudades"));
    }

    /** Minusculas, sin acentos y sin espacios de sobra. */
    private static String normalizar(String texto) {
        return Normalizer.normalize(texto.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
