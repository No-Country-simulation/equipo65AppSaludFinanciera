package com.fintechvital.api.service;

import com.fintechvital.api.dto.TransaccionDtos;
import com.fintechvital.api.dto.TransaccionResponse;
import com.fintechvital.api.error.ErrorNegocio;
import com.fintechvital.api.model.Transaccion;
import com.fintechvital.api.repository.CategoriaRepository;
import com.fintechvital.api.repository.TarjetaRepository;
import com.fintechvital.api.repository.TransaccionRepository;
import com.fintechvital.api.repository.UsuarioRepository;
import com.fintechvital.api.security.UsuarioActual;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Movimientos del usuario: lista con filtros, alta manual, correccion de
 * categoria, baja e importacion de un extracto en CSV.
 *
 * Dos reglas que valen para todo el archivo:
 *
 *  - **RN9**: todo filtra por el usuario del token. El id sale de
 *    {@link UsuarioActual}, jamas de la URL ni del cuerpo.
 *  - Lo que no es tuyo devuelve **404, nunca 403**: un 403 confirmaria que ese
 *    id existe y convierte el endpoint en un detector de movimientos ajenos.
 */
@Service
public class TransaccionService {

    private static final Logger log = LoggerFactory.getLogger(TransaccionService.class);

    /** Tope de pagina. Sin el, un `?tam=1000000` se trae la tabla entera. */
    private static final int TAM_MAXIMO = 500;
    private static final int TAM_POR_DEFECTO = 50;

    /** Limites del import (CONTRATO_API §5). */
    private static final long CSV_BYTES_MAXIMO = 5L * 1024 * 1024;
    private static final int CSV_FILAS_MAXIMO = 5_000;
    private static final List<String> CSV_CABECERA = List.of("fecha", "descripcion", "valor");

    private final TransaccionRepository transacciones;
    private final CategoriaRepository categorias;
    private final TarjetaRepository tarjetas;
    private final UsuarioRepository usuarios;
    private final ClienteMlService ml;

    public TransaccionService(TransaccionRepository transacciones,
                              CategoriaRepository categorias,
                              TarjetaRepository tarjetas,
                              UsuarioRepository usuarios,
                              ClienteMlService ml) {
        this.transacciones = transacciones;
        this.categorias = categorias;
        this.tarjetas = tarjetas;
        this.usuarios = usuarios;
        this.ml = ml;
    }

    // ----------------------------------------------------------------- lista ---

    @Transactional(readOnly = true)
    public TransaccionDtos.Pagina listar(LocalDate desde, LocalDate hasta, String categoria,
                                         String tarjeta, Integer pagina, Integer tam) {
        int indice = Math.max(pagina == null ? 0 : pagina, 0);
        int tamano = Math.min(Math.max(tam == null ? TAM_POR_DEFECTO : tam, 1), TAM_MAXIMO);

        UUID idTarjeta = tarjeta == null || tarjeta.isBlank() ? null : aUuid(tarjeta, "tarjeta");
        String slug = categoria == null || categoria.isBlank() ? null : categoria;

        Page<Transaccion> resultado = transacciones.filtrar(
                UsuarioActual.id(), desde, hasta, slug, idTarjeta, PageRequest.of(indice, tamano));

        return new TransaccionDtos.Pagina(
                resultado.getContent().stream().map(TransaccionResponse::de).toList(),
                resultado.getTotalElements(),
                indice,
                tamano);
    }

    // ------------------------------------------------------------------ alta ---

    @Transactional
    public TransaccionResponse crear(TransaccionDtos.Alta alta) {
        UUID usuario = UsuarioActual.id();
        Transaccion t = new Transaccion();
        t.setUsuarioId(usuario);
        t.setDescripcion(alta.descripcion().trim());
        t.setValor(exigirValorConSigno(alta.valor()));
        t.setMoneda(alta.moneda() != null ? alta.moneda() : monedaDe(usuario));
        t.setFecha(alta.fecha() != null ? alta.fecha() : LocalDate.now());
        t.setComercio(alta.comercio());
        t.setMedioOperacion(alta.medioOperacion());
        t.setEstado("completada");

        if (alta.idTarjeta() != null && !alta.idTarjeta().isBlank()) {
            UUID idTarjeta = aUuid(alta.idTarjeta(), "id_tarjeta");
            // RN9: la tarjeta tiene que ser suya, si no se colgaria un
            // movimiento de la tarjeta de otra persona.
            tarjetas.delUsuario(idTarjeta, usuario).orElseThrow(() -> new ErrorNegocio(
                    HttpStatus.NOT_FOUND, "TARJETA_NO_ENCONTRADA", "Esa tarjeta no existe"));
            t.setTarjetaId(idTarjeta);
        }

        aplicarCategoria(t, alta.categoria());
        return TransaccionResponse.de(transacciones.save(t));
    }

    /**
     * Quien decide la categoria: la persona si la eligio, el modelo si no.
     *
     * Cuando la pone la persona, `confianza` va a NULL en la base -- lo exige
     * ck_transaccion_confianza_origen (RN3) -- y el DTO la reporta como 1.
     */
    private void aplicarCategoria(Transaccion t, String elegida) {
        if (elegida != null && !elegida.isBlank()) {
            t.setCategoriaSlug(exigirCategoriaValida(elegida));
            t.setCategoriaOrigen("usuario");
            t.setConfianza(null);
            t.setModeloVersion(null);
            return;
        }
        clasificarConElModelo(t);
    }

    /**
     * Clasifica con el servicio de ML.
     *
     * Si el ML no responde se propaga su 503 y el alta NO se guarda. Es
     * deliberado: la alternativa seria inventar una categoria, y la regla del
     * proyecto es que antes se dice "ahora no puedo" que se devuelve una
     * prediccion que nadie hizo. Quien no quiera depender de eso puede mandar
     * `categoria` en el alta y no se llama al modelo.
     */
    private void clasificarConElModelo(Transaccion t) {
        var entrada = new ClienteMlService.EntradaTransaccion("0", t.getDescripcion(), t.getValor());
        var respuesta = ml.clasificar(List.of(entrada));

        if (respuesta == null || respuesta.resultados() == null || respuesta.resultados().isEmpty()) {
            throw new ErrorNegocio(HttpStatus.SERVICE_UNAVAILABLE, "ML_NO_DISPONIBLE",
                    "El servicio de clasificacion no devolvio una categoria");
        }
        var resultado = respuesta.resultados().get(0);
        t.setCategoriaSlug(resultado.categoria());
        t.setCategoriaOrigen("modelo");
        t.setConfianza(resultado.confianza());
        t.setModeloVersion(respuesta.modeloVersion());
    }

    // ------------------------------------------------------------ correccion ---

    /**
     * "Corregir categoria" en la fila de Movimientos.
     *
     * Al corregir a mano la categoria pasa a ser del usuario y la confianza del
     * modelo deja de tener sentido (RN3): se guarda NULL, no el numero viejo.
     * Hacia fuera el DTO la reporta como 1.
     */
    @Transactional
    public TransaccionResponse corregirCategoria(UUID id, String categoria) {
        Transaccion t = mia(id);
        t.setCategoriaSlug(exigirCategoriaValida(categoria));
        t.setCategoriaOrigen("usuario");
        t.setConfianza(null);
        t.setModeloVersion(null);
        return TransaccionResponse.de(transacciones.save(t));
    }

    @Transactional
    public void eliminar(UUID id) {
        transacciones.delete(mia(id));
    }

    // ---------------------------------------------------------------- import ---

    /**
     * Importa un extracto en CSV: `fecha,descripcion,valor[,moneda]`.
     *
     * Import PARCIAL a proposito (CONTRATO_API §5): las filas validas entran y
     * las rotas se reportan con su numero de linea. Rechazar el archivo entero
     * por una fila mala obligaria a que la persona encuentre el error a ojo en
     * un extracto de 300 lineas.
     *
     * Las categorias se piden al ML en UNA sola llamada, no una por fila: 300
     * llamadas HTTP en serie tardarian minutos y agotarian el pool.
     */
    @Transactional
    public TransaccionDtos.ResultadoImport importar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw ErrorNegocio.validacion("archivo", "no puede estar vacio");
        }
        if (archivo.getSize() > CSV_BYTES_MAXIMO) {
            throw ErrorNegocio.validacion("archivo", "no puede pasar de 5 MB");
        }

        UUID usuario = UsuarioActual.id();
        String monedaUsuario = monedaDe(usuario);

        List<Transaccion> validas = new ArrayList<>();
        List<TransaccionDtos.ResultadoImport.ErrorFila> errores = new ArrayList<>();

        try (var lector = new BufferedReader(
                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

            String cabecera = lector.readLine();
            exigirCabecera(cabecera);

            String linea;
            int numeroFila = 1; // la cabecera es la 1: los errores se reportan como los ve la persona
            while ((linea = lector.readLine()) != null) {
                numeroFila++;
                if (linea.isBlank()) continue;
                if (validas.size() + errores.size() >= CSV_FILAS_MAXIMO) {
                    errores.add(new TransaccionDtos.ResultadoImport.ErrorFila(
                            numeroFila, "se supero el maximo de " + CSV_FILAS_MAXIMO + " filas"));
                    break;
                }
                try {
                    validas.add(aTransaccion(linea, usuario, monedaUsuario));
                } catch (ErrorNegocio e) {
                    errores.add(new TransaccionDtos.ResultadoImport.ErrorFila(numeroFila, e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "CSV_ILEGIBLE",
                    "No se pudo leer el archivo");
        }

        clasificarLote(validas);
        transacciones.saveAll(validas);

        return new TransaccionDtos.ResultadoImport(validas.size(), errores.size(), errores);
    }

    private void exigirCabecera(String cabecera) {
        if (cabecera == null) {
            throw ErrorNegocio.validacion("archivo", "el CSV esta vacio");
        }
        // El BOM que mete Excel al guardar en UTF-8 dejaria la primera columna
        // como "﻿fecha" y la cabecera se daria por invalida sin que se vea
        // nada raro en el archivo.
        List<String> columnas = List.of(cabecera.replace("﻿", "").trim().toLowerCase().split(",", -1));
        if (!columnas.containsAll(CSV_CABECERA)) {
            throw ErrorNegocio.validacion("archivo",
                    "la cabecera tiene que traer al menos: " + String.join(",", CSV_CABECERA));
        }
    }

    /** Una fila del CSV. Sin libreria: el formato del contrato no lleva comillas ni escapes. */
    private Transaccion aTransaccion(String linea, UUID usuario, String monedaUsuario) {
        String[] campos = linea.split(",", -1);
        if (campos.length < 3) {
            throw ErrorNegocio.validacion("fila", "faltan columnas (fecha,descripcion,valor)");
        }

        Transaccion t = new Transaccion();
        t.setUsuarioId(usuario);
        try {
            t.setFecha(LocalDate.parse(campos[0].trim()));
        } catch (DateTimeParseException e) {
            throw ErrorNegocio.validacion("fecha", "no es una fecha AAAA-MM-DD");
        }

        String descripcion = campos[1].trim();
        if (descripcion.isEmpty() || descripcion.length() > 200) {
            throw ErrorNegocio.validacion("descripcion", "tiene que medir entre 1 y 200 caracteres");
        }
        t.setDescripcion(descripcion);

        try {
            t.setValor(exigirValorConSigno(new BigDecimal(campos[2].trim())));
        } catch (NumberFormatException e) {
            throw ErrorNegocio.validacion("valor", "no es un numero");
        }

        String moneda = campos.length > 3 ? campos[3].trim() : "";
        t.setMoneda(moneda.isEmpty() ? monedaUsuario : moneda.toUpperCase());
        t.setEstado("completada");
        return t;
    }

    /** Una sola llamada al ML para todo el lote; el indice reasocia cada resultado. */
    private void clasificarLote(List<Transaccion> lote) {
        if (lote.isEmpty()) return;

        List<ClienteMlService.EntradaTransaccion> entradas = new ArrayList<>(lote.size());
        for (int i = 0; i < lote.size(); i++) {
            entradas.add(new ClienteMlService.EntradaTransaccion(
                    String.valueOf(i), lote.get(i).getDescripcion(), lote.get(i).getValor()));
        }

        var respuesta = ml.clasificar(entradas);
        for (var resultado : respuesta.resultados()) {
            int i = Integer.parseInt(resultado.id());
            if (i < 0 || i >= lote.size()) {
                log.warn("El ML devolvio el indice {} para un lote de {}: se ignora", i, lote.size());
                continue;
            }
            Transaccion t = lote.get(i);
            t.setCategoriaSlug(resultado.categoria());
            t.setCategoriaOrigen("modelo");
            t.setConfianza(resultado.confianza());
            t.setModeloVersion(respuesta.modeloVersion());
        }
    }

    // ----------------------------------------------------------------- apoyo ---

    /** La transaccion, comprobando que es de quien la pide. Si no, 404. */
    private Transaccion mia(UUID id) {
        return transacciones.findByIdAndUsuarioId(id, UsuarioActual.id())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.NOT_FOUND, "TRANSACCION_NO_ENCONTRADA",
                        "Ese movimiento no existe"));
    }

    private String exigirCategoriaValida(String slug) {
        String limpio = slug.trim();
        if (!categorias.existsBySlugAndActivaTrue(limpio)) {
            throw ErrorNegocio.validacion("categoria",
                    "'" + limpio + "' no es una categoria del catalogo");
        }
        return limpio;
    }

    /** ck_transaccion_valor: cero no significa nada y ensucia todos los ratios. */
    private BigDecimal exigirValorConSigno(BigDecimal valor) {
        if (valor == null || valor.signum() == 0) {
            throw ErrorNegocio.validacion("valor", "no puede ser cero (el signo es el dato: >0 ingreso, <0 gasto)");
        }
        return valor;
    }

    private String monedaDe(UUID usuario) {
        return usuarios.findById(usuario)
                .map(u -> u.getMonedaPrincipal())
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                        "El usuario del token ya no existe"));
    }

    private static UUID aUuid(String valor, String campo) {
        try {
            return UUID.fromString(valor);
        } catch (IllegalArgumentException e) {
            throw ErrorNegocio.validacion(campo, "no es un identificador valido");
        }
    }
}
