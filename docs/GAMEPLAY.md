# FRECUENCIA ROTA · juego de cartas

**Resumen en 5 líneas**

1. De 3 a 8 personas comparten una mesa online (sala con código de 4 letras); cada una lleva un personaje, 6 cartas ilustradas y 5 palabras.
2. Cada ronda un Narrador distinto juega una carta y da la pista con **una sola palabra de su mano**; el resto elige en secreto una carta que encaje.
3. Todas las cartas se barajan y se revelan; quien no narra vota cuál era la del Narrador y se puntúa (narrador +3, votos +1, acierto +3, +2 para todos si aciertan todos o nadie).
4. Cada punto es una casilla: los personajes saltan al **sendero de 30 casillas** que rodea la mesa y caminan casilla a casilla con animación y sonido.
5. Tras puntuar hay 20 s de **trueque de palabras**; a las 5 rondas (o al llegar a la casilla 30) gana quien esté más adelante.

**Decisiones tomadas en los puntos ambiguos**

- **Stack:** se reutiliza la infraestructura del proyecto (cliente web estático + MQTT/HiveMQ). El anfitrión de la sala mantiene el estado autoritativo y lo sincroniza; no hay que instalar nada en el PC del profesor y funciona en GitHub Pages.
- **8 personajes:** solo existen 3 personajes canónicos. Se conservan intactos y se añaden 5 **Ecos** (mismo sprite pixel-art, color y llamada propios) para poder sentar hasta 8 jugadores sin duplicar fichas.
- **Cartas:** 80 ilustraciones SVG originales generadas por código (20 motivos × 4 paletas), sin arte de Dixit ni bancos de imágenes. Mazo neutral aparte (12 cartas) para las cartas fantasma.
- **Trueque:** oferta de una palabra a otro jugador, que acepta o rechaza; un trueque por jugador y ronda, con botón «listo» para cerrar antes de los 20 s.
- **Desempates:** gana quien esté más adelante; a igual casilla, quien tenga más puntos totales; si persiste, victoria compartida.
