# Auditoría previa al rediseño (v1.2.0 · plataformas)

1. **Mapas/niveles:** `js/levels.js` define 3 niveles/eras (Prehistoria, Antigüedad, Núcleo) con plataformas, ocultas, ascensores, puertas, consolas, puentes, fragmentos, orbes, checkpoints, salidas y decoración.
2. **Movimiento/físicas:** `js/game.js` (gravedad 1720, salto, colisiones AABB, cámara, daño, reaparición, HUD, puntuación de nivel) y `js/engine.js` (colisión, plataformas, partículas, dibujo de personajes).
3. **Puzles de plataformas:** `js/tasks.js` (consolas de código, orbes, glifos), `js/portals.js` (portales de la portada), `js/game.js` (enlaces V/A, altares).
4. **Assets exclusivos de plataformas:** `assets/img/bg/prehistoria.jpg`, `assets/img/bg/antiguedad.jpg` y el decorado procedural de `engine.js`. Los 6 fotogramas `assets/img/char/mudo/*` NO son exclusivos: son el personaje.
5. **UI de plataformas:** `css/style.css` (HUD, cinemáticas, portales), `js/app.js` (pantallas), `js/settings.js`, `js/credits.js`, `js/store.js`, `js/i18n.js` (93 KB de textos de niveles).
6. **Online existente:** `js/online.js` + `vendor/mqtt.min.js` sobre HiveMQ (`wss://broker.hivemq.com:8884/mqtt`), salas por código de 6 caracteres, anfitrión autoritativo, presencia y ping. **Se reutiliza la infraestructura MQTT y el concepto de sala por código** (código nuevo de 4 letras).
7. **Se conserva:** los 3 personajes (Mudo/eco, Resonancia, Glifo) con su sprite pixel-art y sus colores; paleta azul/violeta/cian/ámbar; tipografías Cinzel y Silkscreen; estilo de ilustración; menús y tono visual.
8. **Se conserva y amplía:** audio sintetizado (nuevo módulo), ajustes básicos (sonido/reducir movimiento) e icono.
9. **Se elimina:** mapas, niveles, físicas, movimiento, cámara, enemigos, orbes, pickups, HUD de plataformas, portales, tareas de puzle y sus tests.
10. **Respaldos:** rama `backup-plataformas` con commit `aa1c2f5` (todo el plataformas v1.2.0). El rediseño vive en la rama `juego-cartas` y se publica en `main` al final.
