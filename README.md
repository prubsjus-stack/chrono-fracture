# FRECUENCIA ROTA

**Un juego de cartas sobre lo que no se puede decir.**
De 3 a 8 personas, una mesa online, 30 casillas y una sola palabra por ronda.

La mesa se abre en el navegador y se sincroniza por MQTT: no hay que instalar nada
en el PC de quien organiza la partida. Conserva los personajes, la paleta, la
tipografía y el icono del proyecto original; todo lo de plataformas (mapas,
física, saltos, cámara, enemigos y niveles) se ha retirado.

---

## Arrancar en local (2 comandos)

```powershell
cd C:\chrono-fracture
python -m http.server 8080
```

Abre <http://localhost:8080> en el navegador. Para jugar con varias pestañas,
abre la misma dirección en cada una (cada pestaña es un jugador distinto).

También funciona cualquier servidor estático, por ejemplo `npx serve .`.
No abras `index.html` con doble clic: el juego necesita `http://`, no `file://`.

Versión publicada: <https://prubsjus-stack.github.io/chrono-fracture/>

---

## Cómo se juega

1. **Mesa.** Una persona crea la sala y comparte el **código de 4 letras**. El
   resto entra con ese código. Mínimo 3, máximo 8. Cada jugador elige personaje.
2. **Reparto.** Cada jugador recibe **6 cartas ilustradas** y **5 palabras**.
3. **Pista.** En cada ronda hay un **Narrador** distinto. Elige una de sus cartas
   y da la pista con **una sola palabra de su mano**.
4. **Cartas secretas.** El resto elige en secreto una carta de su mano que encaje
   con la palabra. Las cartas se barajan con las **cartas fantasma** del mazo
   neutral hasta que hay **5 sobre la mesa**.
5. **Votación.** Quien no narra toca la carta que cree que jugó el Narrador.
   No se puede votar la propia (aparece marcada como **TU CARTA**).
6. **Recuento.** Se revelan autores y gemas de voto. Los puntos se convierten en
   casillas: los personajes saltan al sendero y caminan casilla a casilla.
7. **Trueque (20 s).** Cada jugador puede ofrecer **una palabra** a otra persona,
   que acepta o rechaza. Un trueque por jugador y ronda; el botón **Listo** cierra
   el trueque antes de tiempo.
8. **Final.** Gana quien llegue antes a la **casilla 30**. Si nadie llega tras
   **5 rondas**, gana quien esté más lejos; a igual casilla, más puntos; si sigue
   el empate, **victoria compartida**.

### Puntuación

| Situación | Puntos |
| --- | --- |
| El Narrador acierta el ambiente (alguien, pero no todos, vota su carta) | **+3** para el Narrador |
| Todos aciertan o nadie acierta | **0** para el Narrador y **+2** para cada jugador |
| Cada voto recibido | **+1** (solo quienes no narran) |
| Votar la carta del Narrador | **+3** extra |
| Cada punto | **1 casilla** del sendero (tope: casilla 30) |

Las cartas fantasma no dan votos a nadie: si alguien vota una, no suma.

### Si alguien se desconecta

La partida sigue. El estado queda en la mesa y el jugador puede volver a entrar
con el mismo código mientras la pestaña conserve su sesión. Si se va el
**Narrador** durante su turno, la narración pasa a la siguiente persona
conectada sin perder la ronda. Si se cae el anfitrión, el cliente conectado con
el asiento más bajo recupera el estado y continúa la partida.

---

## Qué hay dentro

```
index.html            Estructura de las pantallas
css/style.css         Mesa de madera y paño, cartas, sendero y responsive
js/config.js          Personajes, tiempos, mazo MQTT y utilidades
js/deck.js            80 ilustraciones SVG originales + 12 fantasmas + 40 palabras
js/rules.js           Motor autoritativo: rondas, votos, puntos, trueque, victoria
js/net.js             Salas MQTT, estado público/privado, presencia y relevo
js/sfx.js             Sonidos sintetizados (paso, volteo, gema, victoria)
js/ui.js              Render de sala, mesa, abanico, sendero, trueque y resultados
js/app.js             Controlador, anfitrión, reconexión y API de depuración
assets/img/char/      Sprites de los personajes originales
assets/fonts/         Cinzel y Silkscreen servidas en local
docs/                 Auditoría y resumen de diseño del juego
tests/                Pruebas del motor y de la partida completa
vendor/               Cliente MQTT
```

### Detalles técnicos

- **Estado autoritativo en el anfitrión.** Solo el anfitrión aplica reglas y
  publica el estado; el resto envía acciones. El estado público se difunde por
  MQTT y las manos viajan en un tema privado por jugador.
- **Tiempos** en `js/config.js` (`CF.TIMERS`). Añade `?fast=1` a la URL para
  probar con tiempos cortos. Las fases avanzan solas al terminar el tiempo y
  también antes si todo el mundo ha actuado.
- **Broker público.** `wss://broker.hivemq.com:8884/mqtt`, espacio de nombres
  `brokenfrequency/cards/v2`. Es un broker de pruebas: si la sala no conecta,
  espera unos segundos y reintenta.
- **Privacidad.** Durante pista, envío y votación el autor de cada carta no se
  publica; solo se revela al puntuar. Los votos tampoco se publican hasta el
  recuento.
- **Sin arte ajeno.** Las 80 ilustraciones y las 12 cartas fantasma se generan
  como SVG dentro de `js/deck.js`, a partir de motivos y paletas propias.

---

## Pruebas

Requieren Python, Playwright y Microsoft Edge (canal `msedge`).

```powershell
python -m pip install playwright
python tests/rules.py
python tests/e2e.py
```

- `tests/rules.py` comprueba reparto, recuento, votos fantasma, tope de casilla,
  victoria a 30, final tras 5 rondas, empates, relevo de narrador y trueque.
- `tests/e2e.py` abre **tres pestañas**, crea una mesa, se une con el código,
  juega **5 rondas completas** con trueque y verifica resultados y consola limpia.

---

## Publicar en GitHub Pages

El sitio es estático. Basta con subir `index.html`, `css/`, `js/`, `assets/` y
`vendor/` a la rama publicada (`main`). No hay compilación ni servidor propio.
