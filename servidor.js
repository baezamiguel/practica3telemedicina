var express = require('express');
var cors = require('cors');
var path = require('path');
var jwt = require('jwt-simple'); // 🔑 Librería para JWT

// 1. Importar e inicializar el cliente de Supabase
const { createClient } = require('@supabase/supabase-js');

// 2. Configuración directa con tu URL y tu Key de Supabase
const supabaseUrl = 'https://eduzgekecoxxbimswfvp.supabase.co';
const supabaseKey = 'sb_publishable_q5ReC5L87fcCOY52BbETuw_iEk_LBvr';

const supabase = createClient(supabaseUrl, supabaseKey);

// Servidor WebSocket (Si tampoco lo usas en GitHub, puedes comentar la línea de abajo)
//require('./servidor_ws.js');

var app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// 🔒 CONFIGURACIÓN Y MIDDLEWARE JWT (PARTE 2)
// ==========================================
const CLAVE_SECRETA = "clave_secreta_hospital_jwt_2026";



// Servimos las apps
app.use('/gestor', express.static(path.join(__dirname, 'Cliente_rest')));
app.use('/sanitario', express.static(path.join(__dirname, 'cliente_rpc')));

app.get('/', function(req, res) {
    res.redirect('/gestor');
});



//////////////////////////////
// 2️⃣ GESTORES
//////////////////////////////

// LOGIN
app.post('/api/gestores/login', async function(req, res) {
    var credenciales = req.body;

    const { data: gestores, error } = await supabase
        .from('gestores')
        .select('id')
        .eq('usuario', credenciales.usuario)
        .eq('password', credenciales.password);

    if (error) return res.status(500).json({ error: "Error en BD: " + error.message });

    if (gestores && gestores.length > 0) {
        var idGestor = gestores[0].id;

        var contenido = { 
            usuario: idGestor,
            expira: Date.now() + 2 * 60 * 60 * 1000 // expira dentro de 2 horas (en ms)
        };
        var token = jwt.encode(contenido, CLAVE_SECRETA);

        res.status(200).json({
            id: idGestor,
            token: token
        });
    } else {
        res.status(403).json({ error: "Login incorrecto" });
    }
});

// REGISTRO
app.post('/api/gestores', async function(req, res) {
    var nuevo = req.body;

    const { data: existentes, error: errorCheck } = await supabase
        .from('gestores')
        .select('id')
        .eq('usuario', nuevo.usuario);

    if (errorCheck) return res.status(500).json({ error: "Error en BD" });

    if (existentes && existentes.length > 0) {
        return res.status(403).json({ error: "El login ya está en uso" });
    }

    const { data: insertados, error: errorInsert } = await supabase
        .from('gestores')
        .insert([nuevo])
        .select();

    if (errorInsert) return res.status(500).json({ error: "Error al insertar: " + errorInsert.message });

    var copia = { ...insertados[0] };
    delete copia.password;
    res.status(201).json(copia);
});
// ==========================================
// 🔒 MIDDLEWARE GLOBAL DEL PROFESOR
// Antes de este use, los servicios son públicos. Después son privados.
// ==========================================
app.use("/api", function (req, res, next) {
    var cabeceraAuth = req.headers['authorization'];
    var token = cabeceraAuth ? cabeceraAuth.split(' ')[1] : null;

    if (!token && req.query.token) token = req.query.token;

    if (!token) return res.status(401).json({ error: "No se ha encontrado token" });

    var contenidoToken;
    try { 
        contenidoToken = jwt.decode(token, CLAVE_SECRETA); 
    } catch (error) {
        return res.status(403).json({ error: "El token es incorrecto" });
    }

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) { 
        return res.status(403).json({ error: "Formato inadecuado" });
    }

    if (contenidoToken.expira < Date.now()) {
        return res.status(403).json({ error: "El token ha expirado" });
    }

    req.gestor = contenidoToken;
    next();
});

// ACTUALIZAR
app.put('/api/gestores/:id', async function(req, res) {
    var idGestor = req.params.id;
    var datosNuevos = req.body;

    if (datosNuevos.usuario) {
        const { data: existentes, error: errorCheck } = await supabase
            .from('gestores')
            .select('id')
            .eq('usuario', datosNuevos.usuario)
            .neq('id', idGestor);

        if (errorCheck) return res.status(500).json({ error: "Error en BD" });

        if (existentes && existentes.length > 0) {
            return res.status(403).json({ error: "El login ya está en uso" });
        }
    }

    const { data: actualizados, error: errorUpdate } = await supabase
        .from('gestores')
        .update(datosNuevos)
        .eq('id', idGestor)
        .select();

    if (errorUpdate) return res.status(500).json({ error: "Error al actualizar" });
    if (!actualizados || actualizados.length === 0) return res.status(404).json({ error: "Gestor no encontrado" });

    var copia = { ...actualizados[0] };
    delete copia.password;
    res.status(200).json(copia);
});

//////////////////////////////
// 1️⃣ CATÁLOGOS
//////////////////////////////

app.get('/api/ubicaciones', async function(req, res) {
    const { data, error } = await supabase.from('ubicaciones').select('*');
    if (error) return res.status(500).json({ error: "Error en BD: " + error.message });
    res.status(200).json(data);
});

app.get('/api/categorias', async function(req, res) {
    const { data, error } = await supabase.from('categorias').select('*');
    if (error) return res.status(500).json({ error: "Error en BD: " + error.message });
    res.status(200).json(data);
});

app.get('/api/modelos', async function(req, res) {
    const { data, error } = await supabase.from('modelos').select('*');
    if (error) return res.status(500).json({ error: "Error en BD: " + error.message });
    res.status(200).json(data);
});

// OBTENER POR ID
app.get('/api/gestores/:id', async function(req, res) {
    const { data: gestores, error } = await supabase
        .from('gestores')
        .select('*')
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: "Error en BD" });
    if (!gestores || gestores.length === 0) return res.status(404).json({ error: "Gestor no encontrado" });

    var copia = { ...gestores[0] };
    delete copia.password;
    res.status(200).json(copia);
});

//////////////////////////////
// 3️⃣ SANITARIOS
//////////////////////////////

app.get('/api/sanitarios/:id', async function(req, res) {
    const { data: sanitarios, error } = await supabase
        .from('sanitarios')
        .select('*')
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: "Error en BD" });
    if (!sanitarios || sanitarios.length === 0) return res.status(404).json({ error: "Sanitario no encontrado" });

    var copia = { ...sanitarios[0] };
    delete copia.codigoAcceso;
    res.status(200).json(copia);
});

//////////////////////////////
// 4️⃣ RECURSOS
//////////////////////////////

// LISTADO CON FILTROS
app.get('/api/recursos', async function(req, res) {
    let query = supabase.from('recurso').select('*');

    if (req.query.categoria && req.query.categoria != "0") {
        const { data: modCat } = await supabase
            .from('modelos')
            .select('id')
            .eq('categoria', req.query.categoria);

        const idsModelos = modCat ? modCat.map(m => m.id) : [];
        if (idsModelos.length > 0) {
            query = query.in('modelo', idsModelos);
        } else {
            return res.status(200).json([]);
        }
    }

    if (req.query.modelo && req.query.modelo != "0") {
        query = query.eq('modelo', req.query.modelo);
    }

    if (req.query.ubicacion && req.query.ubicacion != "0") {
        query = query.eq('ubicacion', req.query.ubicacion);
    }

    if (req.query.estado && req.query.estado != "-1") {
        query = query.eq('estado', req.query.estado);
    }

    const { data: lista, error } = await query;

    if (error) return res.status(500).json({ error: "Error en BD: " + error.message });
    res.status(200).json(lista);
});

// OBTENER POR ID
app.get('/api/recursos/:id', async function(req, res) {
    const { data: recursos, error } = await supabase
        .from('recurso')
        .select('*')
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: "Error en BD" });
    if (!recursos || recursos.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

    res.status(200).json(recursos[0]);
});

// CREAR
app.post('/api/recursos', async function(req, res) {
    var nuevo = req.body;

    const { data: insertados, error } = await supabase
        .from('recurso')
        .insert([nuevo])
        .select();

    if (error) return res.status(500).json({ error: "Error al insertar recurso: " + error.message });

    res.status(201).json(insertados[0]);
});

// ACTUALIZAR
app.put('/api/recursos/:id', async function(req, res) {
    const { data: actualizados, error } = await supabase
        .from('recurso')
        .update(req.body)
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: "Error al actualizar recurso" });
    if (!actualizados || actualizados.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

    res.status(200).json(actualizados[0]);
});

// BORRAR
app.delete('/api/recursos/:id', async function(req, res) {
    const { data: borrados, error } = await supabase
        .from('recurso')
        .delete()
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: "Error al borrar recurso" });
    if (!borrados || borrados.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

    res.status(200).json({ mensaje: "Recurso borrado correctamente" });
});

//////////////////////////////
// 5️⃣ RESERVAS Y RESEÑAS
//////////////////////////////

app.get('/api/recursos/:id/reservas', async function(req, res) {
    const { data: recursos, error: errRec } = await supabase
        .from('recurso')
        .select('id')
        .eq('id', req.params.id);

    if (errRec) return res.status(500).json({ error: "Error en BD" });
    if (!recursos || recursos.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

    const { data: reservas, error: errRes } = await supabase
        .from('reservas')
        .select('*')
        .eq('recurso', req.params.id);

    if (errRes) return res.status(500).json({ error: "Error en BD" });
    res.status(200).json(reservas);
});

app.get('/api/recursos/:id/resenyas', async function(req, res) {
    const { data: recursos, error: errRec } = await supabase
        .from('recurso')
        .select('id')
        .eq('id', req.params.id);

    if (errRec) return res.status(500).json({ error: "Error en BD" });
    if (!recursos || recursos.length === 0) return res.status(404).json({ error: "Recurso no encontrado" });

    const { data: resenyas, error: errRes } = await supabase
        .from('resenyas')
        .select('*')
        .eq('recurso', req.params.id);

    if (errRes) return res.status(500).json({ error: "Error en BD" });
    res.status(200).json(resenyas);
});

//////////////////////////////
// ARRANCAR SERVIDOR
//////////////////////////////

var puerto = process.env.PORT || 3000;
app.listen(puerto, function() {
    console.log("Servidor hospitalario funcionando en puerto " + puerto);
});
