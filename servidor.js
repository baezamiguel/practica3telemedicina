var express = require('express');
var cors = require('cors');
var path = require('path');
var jwt = require('jsonwebtoken'); // 🔑 Librería para JWT

// Sustituimos datos.js por nuestra conexión a MariaDB
var conexion = require('./conexion_mysql.js');

// Arrancamos los otros servidores
require('./servidor_rpc.js'); 
require('./servidor_ws.js');

var app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// 🔒 CONFIGURACIÓN Y MIDDLEWARE JWT (PARTE 2)
// ==========================================
const CLAVE_SECRETA = "clave_secreta_hospital_jwt_2026";

function verificarToken(req, res, next) {
    // 1. Leemos la cabecera Authorization que envía rest.js
    const cabeceraAuth = req.headers['authorization'];

    if (!cabeceraAuth) {
        return res.status(401).json({ error: "Acceso bloqueado: No has enviado token." });
    }

    // 2. Separamos "Bearer <token>" para quedarnos solo con el código
    const token = cabeceraAuth.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Acceso bloqueado: Formato de token inválido." });
    }

    // 3. Verificamos que el token sea válido y no haya expirado
    jwt.verify(token, CLAVE_SECRETA, function(err, datosDecodificados) {
        if (err) {
            return res.status(403).json({ error: "Token inválido o expirado." });
        }

        // Guardamos los datos del gestor autenticado y dejamos pasar la petición
        req.gestor = datosDecodificados;
        next();
    });
}

// Servimos las apps
app.use('/gestor', express.static(path.join(__dirname, 'cliente_rest')));
app.use('/sanitario', express.static(path.join(__dirname, 'cliente_rpc')));

app.get('/', function(req, res) {
    res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1>🏥 Portal Hospitalario SD</h1>
            <a href="/gestor" style="font-size: 20px; margin: 20px; display: inline-block;">👩‍💼 Acceso Gestores</a>
            <a href="/sanitario" style="font-size: 20px; margin: 20px; display: inline-block;">🩺 Acceso Sanitarios</a>
        </div>
    `);
});

//////////////////////////////
// 1️⃣ CATÁLOGOS (Protegidos con verificarToken)
//////////////////////////////

app.get('/api/ubicaciones', verificarToken, function(req, res) {
    conexion.query("SELECT * FROM ubicaciones", function(err, resultados) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        res.status(200).json(resultados);
    });
});

app.get('/api/categorias', verificarToken, function(req, res) {
    conexion.query("SELECT * FROM categorias", function(err, resultados) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        res.status(200).json(resultados);
    });
});

app.get('/api/modelos', verificarToken, function(req, res) {
    conexion.query("SELECT * FROM modelos", function(err, resultados) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        res.status(200).json(resultados);
    });
});

//////////////////////////////
// 2️⃣ GESTORES
//////////////////////////////

// LOGIN (Público: Aquí es donde se fabrica y entrega el Token JWT)
app.post('/api/gestores/login', function(req, res) {
    var credenciales = req.body;
    var sql = "SELECT id FROM gestores WHERE usuario = ? AND password = ?";
    
    conexion.query(sql, [credenciales.usuario, credenciales.password], function(err, gestores) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        
        if (gestores.length > 0) {
            var idGestor = gestores[0].id;

            // 🔑 Creamos el token JWT firmado (caduca en 2 horas)
            var token = jwt.sign(
                { id: idGestor, usuario: credenciales.usuario },
                CLAVE_SECRETA,
                { expiresIn: '2h' }
            );

            // Devolvemos el ID y el Token
            res.status(200).json({
                id: idGestor,
                token: token
            });
        } else {
            res.status(403).json({ error: "Login incorrecto" });
        }
    });
});

// REGISTRO (Público para permitir crear cuenta en la pantalla inicial)
app.post('/api/gestores', function(req, res) {
    var nuevo = req.body;

    conexion.query("SELECT id FROM gestores WHERE usuario = ?", [nuevo.usuario], function(err, existentes) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        
        if (existentes.length > 0) {
            return res.status(403).json({ error: "El login ya está en uso" });
        }

        conexion.query("INSERT INTO gestores SET ?", [nuevo], function(err, resultado) {
            if (err) return res.status(500).json({ error: "Error al insertar" });

            var copia = { ...nuevo, id: resultado.insertId };
            delete copia.password;
            res.status(201).json(copia);
        });
    });
});

// ACTUALIZAR (Protegido con verificarToken)
app.put('/api/gestores/:id', verificarToken, function(req, res) {
    var idGestor = req.params.id;
    var datosNuevos = req.body;

    function hacerUpdate() {
        conexion.query("UPDATE gestores SET ? WHERE id = ?", [datosNuevos, idGestor], function(err, resultado) {
            if (err) return res.status(500).json({ error: "Error al actualizar" });
            if (resultado.affectedRows === 0) return res.status(404).json({ error: "Gestor no encontrado" });

            var copia = { ...datosNuevos, id: parseInt(idGestor) };
            delete copia.password;
            res.status(200).json(copia);
        });
    }

    if (datosNuevos.usuario) {
        var sqlCheck = "SELECT id FROM gestores WHERE usuario = ? AND id != ?";
        conexion.query(sqlCheck, [datosNuevos.usuario, idGestor], function(err, existentes) {
            if (err) return res.status(500).json({ error: "Error en BD" });
            if (existentes.length > 0) {
                return res.status(403).json({ error: "El login ya está en uso" });
            }
            hacerUpdate();
        });
    } else {
        hacerUpdate();
    }
});

// OBTENER POR ID (Protegido con verificarToken)
app.get('/api/gestores/:id', verificarToken, function(req, res) {
    conexion.query("SELECT * FROM gestores WHERE id = ?", [req.params.id], function(err, gestores) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        if (gestores.length === 0) return res.status(404).json({ error: "Gestor no encontrado" });

        var copia = { ...gestores[0] };
        delete copia.password;
        res.status(200).json(copia);
    });
});

//////////////////////////////
// 3️⃣ SANITARIOS (Protegido con verificarToken)
//////////////////////////////

app.get('/api/sanitarios/:id', verificarToken, function(req, res) {
    conexion.query("SELECT * FROM sanitarios WHERE id = ?", [req.params.id], function(err, sanitarios) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        if (sanitarios.length === 0) return res.status(404).json({ error: "Sanitario no encontrado" });

        var copia = { ...sanitarios[0] };
        delete copia.codigoAcceso;
        res.status(200).json(copia);
    });
});

//////////////////////////////
// 4️⃣ RECURSOS (Protegidos con verificarToken)
//////////////////////////////

// LISTADO CON FILTROS
app.get('/api/recursos', verificarToken, function(req, res) {
    var sql = "SELECT r.* FROM recurso r";
    var params = [];
    var wheres = [];

    if (req.query.categoria && req.query.categoria != "0") {
        sql += " JOIN modelos m ON r.modelo = m.id";
        wheres.push("m.categoria = ?");
        params.push(req.query.categoria);
    }

    if (req.query.modelo && req.query.modelo != "0") {
        wheres.push("r.modelo = ?");
        params.push(req.query.modelo);
    }

    if (req.query.ubicacion && req.query.ubicacion != "0") {
        wheres.push("r.ubicacion = ?");
        params.push(req.query.ubicacion);
    }

    if (req.query.estado && req.query.estado != "-1") {
        wheres.push("r.estado = ?");
        params.push(req.query.estado);
    }

    if (wheres.length > 0) {
        sql += " WHERE " + wheres.join(" AND ");
    }

    conexion.query(sql, params, function(err, lista) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        res.status(200).json(lista);
    });
});

// OBTENER POR ID
app.get('/api/recursos/:id', verificarToken, function(req, res) {
    conexion.query("SELECT * FROM recurso WHERE id = ?", [req.params.id], function(err, recursos) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        if (recursos.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

        res.status(200).json(recursos[0]);
    });
});

// CREAR
app.post('/api/recursos', verificarToken, function(req, res) {
    var nuevo = req.body;
    
    conexion.query("INSERT INTO recurso SET ?", [nuevo], function(err, resultado) {
        if (err) return res.status(500).json({ error: "Error al insertar recurso" });
        
        nuevo.id = resultado.insertId;
        res.status(201).json(nuevo);
    });
});

// ACTUALIZAR
app.put('/api/recursos/:id', verificarToken, function(req, res) {
    conexion.query("UPDATE recurso SET ? WHERE id = ?", [req.body, req.params.id], function(err, resultado) {
        if (err) return res.status(500).json({ error: "Error al actualizar recurso" });
        if (resultado.affectedRows === 0) return res.status(404).json({ error: "Recurso no encontrado" });

        res.status(200).json({ ...req.body, id: parseInt(req.params.id) });
    });
});

// BORRAR
app.delete('/api/recursos/:id', verificarToken, function(req, res) {
    conexion.query("DELETE FROM recurso WHERE id = ?", [req.params.id], function(err, resultado) {
        if (err) return res.status(500).json({ error: "Error al borrar recurso" });
        if (resultado.affectedRows === 0) return res.status(404).json({ error: "Recurso no encontrado" });

        res.status(200).json({ mensaje: "Recurso borrado correctamente" });
    });
});

//////////////////////////////
// 5️⃣ RESERVAS Y RESEÑAS (Protegidos con verificarToken)
//////////////////////////////

app.get('/api/recursos/:id/reservas', verificarToken, function(req, res) {
    conexion.query("SELECT id FROM recurso WHERE id = ?", [req.params.id], function(err, recursos) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        if (recursos.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

        conexion.query("SELECT * FROM reservas WHERE recurso = ?", [req.params.id], function(err, reservas) {
            if (err) return res.status(500).json({ error: "Error en BD" });
            res.status(200).json(reservas);
        });
    });
});

app.get('/api/recursos/:id/resenyas', verificarToken, function(req, res) {
    conexion.query("SELECT id FROM recurso WHERE id = ?", [req.params.id], function(err, recursos) {
        if (err) return res.status(500).json({ error: "Error en BD" });
        if (recursos.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

        conexion.query("SELECT * FROM resenyas WHERE recurso = ?", [req.params.id], function(err, resenyas) {
            if (err) return res.status(500).json({ error: "Error en BD" });
            res.status(200).json(resenyas);
        });
    });
});

//////////////////////////////
// ARRANCAR SERVIDOR
//////////////////////////////

var puerto = 3000;
app.listen(puerto, function() {
    console.log("Servidor hospitalario funcionando en http://localhost:" + puerto);
});