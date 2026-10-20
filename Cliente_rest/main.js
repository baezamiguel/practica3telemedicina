var idGestorLogueado = null;
var categorias = [];
var modelos = [];
var ubicaciones = [];

// ==========================================
// CONFIGURACIÓN Y DICCIONARIO DE ÁREAS MÉDICAS
// ==========================================
const URL_MINISTERIO_API = "https://undefined.ua.es/telemedicina/api/datos";
const MI_ID_AREA = 1;

const MAPA_AREAS = {
    1: "Alergología", 2: "Anestesiología", 3: "Cardiología", 4: "Cirugía General",
    5: "Dermatología", 6: "Aparato Digestivo", 7: "Endocrinología", 8: "Ginecología",
    9: "Hematología", 10: "Medicina Interna", 11: "Neumología", 12: "Neurología",
    13: "Oftalmología", 14: "Oncología", 15: "Pediatría", 16: "Psiquiatría",
    17: "Traumatología", 18: "Urología"
};


// ==========================================
// AL CARGAR LA PÁGINA (PANTALLA DE LOGIN MANUAL)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    cargarRankingMinisterio();
    mostrarSeccion('seccion-login'); // Muestra la pantalla de login por defecto
});

// ==========================================
// FUNCIÓN 1: OBTENER DATOS Y CALCULAR RANKING (GET)
// ==========================================
async function cargarRankingMinisterio() {
    let tbody = document.getElementById("cuerpo-ranking");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='3'>Cargando datos del Ministerio...</td></tr>";

    try {
        const res = await fetch(URL_MINISTERIO_API);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        
        const datosMinisterio = await res.json();

        if (!datosMinisterio || !Array.isArray(datosMinisterio) || datosMinisterio.length === 0) {
            tbody.innerHTML = "<tr><td colspan='3'>No hay datos registrados en el Ministerio.</td></tr>";
            return;
        }

        let contadorAreas = {};
        let reservasVistas = []; // Lista simple para no contar reservas duplicadas

        for (let registro of datosMinisterio) {
            let idArea = registro.id_area;

            // 🛑 Ignorar cualquier área que no esté registrada en MAPA_AREAS
            if (!MAPA_AREAS[idArea]) {
                continue;
            }

            let listaReservas = registro.datos;

            if (Array.isArray(listaReservas)) {
                for (let res of listaReservas) {
                    if (!res) continue;

                    // 1. Extraer los campos de la reserva limpiando espacios
                    let nombre = String(res.nombre || res.nombre_sanitario || "").trim();
                    let apellidos = String(res.apellidos || res.apellidos_sanitario || "").trim();
                    let categoria = String(res.categoría || res.categoria || "").trim();
                    let horas = res.horas_estimadas ?? res.horasEstimadas;
                    let fecPet = String(res.fec_pet || res.fecha_peticion || "").trim();
                    let fecIni = res.fec_ini ? String(res.fec_ini).trim() : "null";
                    let fecFin = res.fecha_fin ? String(res.fecha_fin).trim() : "null";

                    // 2. Comprobar que tenga los campos obligatorios rellenos
                    if (nombre === "" || apellidos === "" || categoria === "" || horas === undefined || horas === null || horas === "" || fecPet === "") {
                        continue;
                    }

                    // 3. Crear texto único para comprobar si la reserva está repetida
                    let claveUnica = `${nombre.toLowerCase()}|${apellidos.toLowerCase()}|${categoria.toLowerCase()}|${horas}|${fecPet}|${fecIni}|${fecFin}`;

                    if (reservasVistas.includes(claveUnica)) {
                        console.warn("⚠️ Reserva duplicada omitida:", claveUnica);
                        continue;
                    }

                    reservasVistas.push(claveUnica);

                    if (!contadorAreas[idArea]) {
                        contadorAreas[idArea] = 0;
                    }
                    contadorAreas[idArea] = contadorAreas[idArea] + 1;
                }
            }
        }

        // Pasar los resultados a un array para poder ordenarlo de mayor a menor
        let ranking = [];
        for (let id in contadorAreas) {
            if (contadorAreas[id] > 0) {
                ranking.push({
                    idArea: id,
                    nombre: MAPA_AREAS[id],
                    total: contadorAreas[id]
                });
            }
        }

        ranking.sort((a, b) => b.total - a.total);

        if (ranking.length === 0) {
            tbody.innerHTML = "<tr><td colspan='3'>No hay reservas válidas ni únicas para mostrar.</td></tr>";
            return;
        }

        pintarFilasRanking(ranking, tbody);

    } catch (err) {
        console.error("Error al cargar ranking:", err);
        tbody.innerHTML = `<tr><td colspan='3' style='color:red;'>Error al conectar con el Ministerio (${err.message})</td></tr>`;
    }
}

async function contar() {
    try {
        const res = await fetch(URL_MINISTERIO_API);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        
        const datosMinisterio = await res.json();

        if (!datosMinisterio || !Array.isArray(datosMinisterio) || datosMinisterio.length === 0) {
            alert("no hay datos");
            return;
        }

        let contadorAreas = {};
        let reservasVistas = []; // Lista simple para no contar reservas duplicadas
        let total=0

        for (let registro of datosMinisterio) {
            let idArea = registro.id_area;

            // 🛑 Ignorar cualquier área que no esté registrada en MAPA_AREAS
            if (!MAPA_AREAS[idArea]) {
                continue;
            }

            let listaReservas = registro.datos;

            if (Array.isArray(listaReservas)) {
                for (let res of listaReservas) {
                    if (!res) continue;

                    // 1. Extraer los campos de la reserva limpiando espacios
                    let nombre = String(res.nombre || res.nombre_sanitario || "").trim();
                    let apellidos = String(res.apellidos || res.apellidos_sanitario || "").trim();
                    let categoria = String(res.categoría || res.categoria || "").trim();
                    let horas = res.horas_estimadas ?? res.horasEstimadas;
                    let fecPet = String(res.fec_pet || res.fecha_peticion || "").trim();
                    let fecIni = res.fec_ini ? String(res.fec_ini).trim() : "null";
                    let fecFin = res.fecha_fin ? String(res.fecha_fin).trim() : "null";

                    // 2. Comprobar que tenga los campos obligatorios rellenos
                    if (nombre === "" || apellidos === "" || categoria === "" || horas === undefined || horas === null || horas === "" || fecPet === "") {
                        continue;
                    }

                    // 3. Crear texto único para comprobar si la reserva está repetida
                    let claveUnica = `${nombre.toLowerCase()}|${apellidos.toLowerCase()}|${categoria.toLowerCase()}|${horas}|${fecPet}|${fecIni}|${fecFin}`;

                    if (reservasVistas.includes(claveUnica)) {
                        console.warn("⚠️ Reserva duplicada omitida:", claveUnica);
                        continue;
                    }

                    reservasVistas.push(claveUnica);

                    if(nombre.toLowerCase()=="termometro"){
                        total+=1
                    }
                }
            }
        }
        
        alert(total)
;

    } catch (err) {
        console.error("Error al cargar ranking:", err);
        alert("error");
    }
}

function pintarFilasRanking(rankingOrdenado, elementoTbody) {
    let html = "";
    for (let i = 0; i < rankingOrdenado.length; i++) {
        html += `
            <tr>
                <td><strong>${i + 1}</strong></td>
                <td>${rankingOrdenado[i].nombre}</td>
                <td>${rankingOrdenado[i].total}</td>
            </tr>
        `;
    }
    elementoTbody.innerHTML = html;
}

function restGetPromise(url) {
    return new Promise((resolve) => {
        rest.get(url, function (status, data) {
            if (status === 200 && data) {
                resolve(data);
            } else {
                resolve(null);
            }
        });
    });
}

async function enviarTodasLasReservasAlMinisterio() {
    try {
        const hoy = new Date().toISOString().split("T")[0];

        const listaCategorias = await restGetPromise("/api/categorias") || [];
        const listaModelos = await restGetPromise("/api/modelos") || [];
        const listaRecursos = await restGetPromise("/api/recursos") || [];

        if (listaRecursos.length === 0) {
            alert("No hay recursos registrados en el sistema.");
            return;
        }

        let todasLasReservas = [];

        for (let recurso of listaRecursos) {
            let mod = listaModelos.find(m => m.id === recurso.modelo);
            let cat = listaCategorias.find(c => mod && c.id === mod.categoria);
            let nombreCategoria = cat ? (cat.nombre || cat.categoria) : "General";

            const reservasRecurso = await restGetPromise("/api/recursos/" + recurso.id + "/reservas") || [];

            for (let reserva of reservasRecurso) {
                let nombreSanitario = "Sanitario";
                let apellidosSanitario = "Desconocido";

                const idSanitario = reserva.sanitario || reserva.id_sanitario;

                if (idSanitario) {
                    const datosSanitario = await restGetPromise("/api/sanitarios/" + idSanitario);
                    if (datosSanitario) {
                        nombreSanitario = datosSanitario.nombre || nombreSanitario;
                        apellidosSanitario = datosSanitario.apellidos || apellidosSanitario;
                    }
                }

                todasLasReservas.push({
                    "nombre": nombreSanitario,
                    "apellidos": apellidosSanitario,
                    "categoría": nombreCategoria,
                    "horas_estimadas": reserva.horas_estimadas || reserva.h_est || reserva.horasEstimadas || 1,
                    "fec_pet": reserva.fec_pet || reserva.fecha_peticion || hoy,
                    "fec_ini": reserva.fec_ini || reserva.fecha_inicio || hoy,
                    "fecha_fin": reserva.fecha_fin || reserva.fec_fin || hoy
                });
            }
        }

        if (todasLasReservas.length === 0) {
            alert("No hay reservas registradas en ningún recurso para enviar.");
            return;
        }

        const cuerpoPeticion = {
            "id_area": MI_ID_AREA,
            "fecha": hoy,
            "datos": todasLasReservas
        };

        const res = await fetch(URL_MINISTERIO_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpoPeticion)
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        await res.json();
        alert("¡Se han enviado con éxito todas las reservas al Ministerio para el Área " + MI_ID_AREA + "!");

        cargarRankingMinisterio();

    } catch (error) {
        console.error("Error al enviar reservas al Ministerio:", error);
        alert("Error al enviar los datos al Ministerio: " + error.message);
    }
}

function cargarCatalogosYBuscar() {
    rest.get("/api/categorias", function(s, r) {
        categorias = r || [];
        rest.get("/api/modelos", function(s, r) {
            modelos = r || [];
            rest.get("/api/ubicaciones", function(s, r) {
                ubicaciones = r || [];
                rellenarSelects();
                buscar();
            });
        });
    });
}

function mostrarRegistro() {
    document.getElementById('reg-nombre').value = "";
    document.getElementById('reg-apellidos').value = "";
    document.getElementById('reg-usuario').value = "";
    document.getElementById('reg-pass').value = "";
    mostrarSeccion('seccion-registro');
}

function ejecutarRegistro() {
    var datos = {
        nombre: document.getElementById('reg-nombre').value,
        apellidos: document.getElementById('reg-apellidos').value,
        usuario: document.getElementById('reg-usuario').value,
        password: document.getElementById('reg-pass').value
    };
    rest.post("/api/gestores", datos, function(s) {
        if (s === 201 || s === 200) {
            alert("Gestor creado con éxito");
            mostrarSeccion('seccion-login');
        } else {
            alert("Error al registrar el gestor (el usuario quizá ya existe)");
        }
    });
}

function editarPerfil() {
    rest.get("/api/gestores/" + idGestorLogueado, function(s, datos) {
        document.getElementById('perfil-id').value = datos.id;
        document.getElementById('perfil-nombre').value = datos.nombre;
        document.getElementById('perfil-apellidos').value = datos.apellidos;
        document.getElementById('perfil-usuario').value = datos.usuario;
        document.getElementById('perfil-pass').value = datos.password || "";
        mostrarSeccion('seccion-perfil');
    });
}

function actualizarPerfil() {
    var id = document.getElementById('perfil-id').value;
    var datos = {
        nombre: document.getElementById('perfil-nombre').value,
        apellidos: document.getElementById('perfil-apellidos').value,
        usuario: document.getElementById('perfil-usuario').value,
        password: document.getElementById('perfil-pass').value
    };
    rest.put("/api/gestores/" + id, datos, function(s) {
        alert("Perfil actualizado correctamente");
        mostrarSeccion('seccion-listado');
    });
}

function volverALogin() {
    mostrarSeccion('seccion-login');
    cargarRankingMinisterio();
}

function rellenarSelects() {
    var busUbi = document.getElementById('bus-ubi');
    var fUbi = document.getElementById('f-ubi');
    var busCat = document.getElementById('bus-cat');
    var fCat = document.getElementById('f-cat');

    var opcionesUbi = ubicaciones.map(u => "<option value='" + u.id + "'>" + u.nombre + "</option>").join("");
    var opcionesCat = categorias.map(c => "<option value='" + c.id + "'>" + c.nombre + "</option>").join("");

    if (busUbi) busUbi.innerHTML = "<option value='0'>Todas</option>" + opcionesUbi;
    if (fUbi) fUbi.innerHTML = opcionesUbi;
    if (busCat) busCat.innerHTML = "<option value='0'>Todas</option>" + opcionesCat;
    if (fCat) fCat.innerHTML = opcionesCat;

    actualizarModelosBuscador();
    actualizarModelosFicha();
}

function actualizarModelosBuscador() {
    var idCat = document.getElementById('bus-cat').value;
    var cbMod = document.getElementById('bus-mod');
    
    var filtrados = modelos.filter(m => m.categoria == idCat || idCat == "0");
    
    var opciones = "<option value='0'>Todos</option>";
    opciones += filtrados.map(m => "<option value='" + m.id + "'>" + m.nombre + "</option>").join("");
    
    cbMod.innerHTML = opciones;
}

// LOGIN MANUAL
function entrar() {
    var usuario = document.getElementById('login-user').value;
    var password = document.getElementById('login-pass').value;

    rest.post("/api/gestores/login", { usuario: usuario, password: password }, function(status, respuesta) {
        if(status == 200 && respuesta) {
            localStorage.setItem("token_jwt", respuesta.token);
            idGestorLogueado = respuesta.id;

            rest.get("/api/gestores/" + idGestorLogueado, function(s, datos) {
                var elNombre = document.getElementById('nombre-gestor');
                var elInfo = document.getElementById('info-usuario');
                if (elNombre && datos) elNombre.innerText = datos.nombre + " " + datos.apellidos;
                if (elInfo) elInfo.style.display = 'flex';
                
                mostrarSeccion('seccion-listado');
                cargarCatalogosYBuscar();
            });
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    });
}

function buscar() {
    var params = [];
    var elCat = document.getElementById('bus-cat');
    var elMod = document.getElementById('bus-mod');
    var elUbi = document.getElementById('bus-ubi');
    var elEst = document.getElementById('bus-est');

    if(elCat && elCat.value != "0") params.push("categoria=" + elCat.value);
    if(elMod && elMod.value != "0") params.push("modelo=" + elMod.value);
    if(elUbi && elUbi.value != "0") params.push("ubicacion=" + elUbi.value);
    if(elEst && elEst.value !== "all" && elEst.value != "-1") params.push("estado=" + elEst.value);

    var url = "/api/recursos" + (params.length ? "?" + params.join("&") : "");

    rest.get(url, function(status, respuesta) {
        var cuerpo = document.getElementById('cuerpo-recursos');
        if(status != 200 || !Array.isArray(respuesta)) {
            cuerpo.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red; padding:20px;'>Error al obtener recursos</td></tr>";
            return;
        }

        var filas = "";
        respuesta.forEach(function(r) {
            var m = modelos.find(item => item.id == r.modelo);
            var c = m ? categorias.find(item => item.id == m.categoria) : null;
            var u = ubicaciones.find(item => item.id == r.ubicacion);
            var estadosStr = ["Operativo", "Baja", "Mantenimiento"];

            filas += "<tr>" +
                "<td>" + (r.numero_serie || "S/N") + "</td>" +
                "<td>" + (c ? c.nombre : "N/A") + "</td>" +
                "<td>" + (m ? m.nombre : "N/A") + "</td>" +
                "<td>" + (u ? u.nombre : "N/A") + "</td>" +
                "<td>" + (estadosStr[r.estado] || "Desconocido") + "</td>" +
                "<td><button onclick='abrirFicha(" + r.id + ")'>Abrir</button>" +
                "<button class='secundario' onclick='borrarRecurso(" + r.id + ")'>X</button></td>" +
            "</tr>";
        });

        cuerpo.innerHTML = filas;
    });
}

function abrirFichaNuevo() {
    document.getElementById('recurso-id').value = "";
    document.getElementById('f-sn').value = "";
    actualizarModelosFicha();
    document.getElementById('cuerpo-reservas').innerHTML = "";
    document.getElementById('cuerpo-resenyas').innerHTML = "";
    mostrarSeccion('seccion-ficha');
}

function guardarRecurso() {
    var id = document.getElementById('recurso-id').value;
    var d = {
        modelo: document.getElementById('f-mod').value,
        numero_serie: document.getElementById('f-sn').value,
        ubicacion: document.getElementById('f-ubi').value,
        estado: document.getElementById('f-est').value
    };

    if(id) {
        rest.put("/api/recursos/" + id, d, function(s) { alert("Recurso actualizado"); mostrarSeccion('seccion-listado'); buscar(); });
    } else {
        rest.post("/api/recursos", d, function(s) { 
            alert("Recurso creado"); mostrarSeccion('seccion-listado'); buscar(); 
        });
    }
}

function volverAListado() {
    mostrarSeccion('seccion-listado');
    buscar();
}

function abrirFicha(id) {
    rest.get("/api/recursos/" + id, function(s, datos) {
        document.getElementById('recurso-id').value = datos.id;
        var modeloInfo = modelos.find(m => m.id == datos.modelo);
        if (modeloInfo) {
            document.getElementById('f-cat').value = modeloInfo.categoria;
            actualizarModelosFicha();
            document.getElementById('f-mod').value = datos.modelo;
        }
        document.getElementById('f-sn').value = datos.numero_serie;
        document.getElementById('f-ubi').value = datos.ubicacion;
        document.getElementById('f-est').value = datos.estado;
    });

    rest.get("/api/recursos/"+id+"/reservas", function(s, reservas) {
        var cuerpo = document.getElementById("cuerpo-reservas");
        var filas = "";
        if(!reservas) reservas = [];

        reservas.forEach(function(r) {
            var sanitario = r.sanitario;
            var horas_estimadas = r.horas_estimadas;
            var fecha_peticion = r.fecha_peticion;
            var fecha_inicio = r.fecha_inicio;
            var fecha_fin = r.fecha_fin;

            var clase = "";
            var ahora = new Date();
            var inicio = fecha_inicio ? new Date(fecha_inicio) : null;
            var fin = fecha_fin ? new Date(fecha_fin) : null;

            if (fin) {
                clase = "reserva-finalizada";
            } else if (!inicio && !fin) {
                clase = "reserva-pendiente";
            } else if (inicio && !fin) {
                var horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60);
                if (horasTranscurridas > horas_estimadas) {
                    clase = "reserva-excedida";
                } else {
                    clase = "reserva-en-uso";
                }
            }

            filas += "<tr class='" + clase + "'>" +
                "<td>" + sanitario + "</td>" +
                "<td>" + horas_estimadas + "</td>" +
                "<td>" + fecha_peticion + "</td>" +
                "<td>" + fecha_inicio + "</td>" +
                "<td>" + fecha_fin + "</td>" +
            "</tr>";
        });
        cuerpo.innerHTML = filas;
    });

    rest.get("/api/recursos/"+id+"/resenyas", function(s, resenyas) {
        var cuerpo = document.getElementById("cuerpo-resenyas");
        var filas = "";
        if(!resenyas) resenyas = [];

        resenyas.forEach(function(r) {
            var sanitario = r.sanitario;
            var fecha = r.fecha;
            var valor = r.valor;
            var comentario = r.descripcion;

            filas += "<tr>" +
                "<td>" + fecha + "</td>" +
                "<td>" + sanitario + "</td>" +
                "<td>" + valor + "</td>" +
                "<td>" + comentario + "</td>" +
            "</tr>";
        });
        cuerpo.innerHTML = filas;
        mostrarSeccion('seccion-ficha');
    });
}

function borrarRecurso(id) {
    if(confirm("¿Seguro que desea borrar este recurso?")) {
        rest.delete("/api/recursos/" + id, function(s) { buscar(); });
    }
}

function mostrarSeccion(id) {
    var s = document.getElementsByClassName('seccion');
    for(var i=0;i<s.length;i++) s[i].classList.remove('activa');
    var objetivo = document.getElementById(id);
    if(objetivo) objetivo.classList.add('activa');
}

function actualizarModelosFicha() {
    var comboCat = document.getElementById('f-cat');
    var cb = document.getElementById('f-mod');
    if(!comboCat || !cb) return;
    var opciones = modelos.filter(m => m.categoria == comboCat.value)
                          .map(m => "<option value='" + m.id + "'>" + m.nombre + "</option>").join("");
    cb.innerHTML = opciones;
}

function salir() {
    idGestorLogueado = null;
    localStorage.removeItem("token_jwt");
    var elInfo = document.getElementById('info-usuario');
    if (elInfo) elInfo.style.display = 'none';
    mostrarSeccion('seccion-login');
}
