# Guía de Mecánicas del Juego - Hide and Seek

## 🎮 Cómo Funciona el Juego

### Fase 1: Lobby
1. Los jugadores se conectan y aparecen en el lobby
2. Cada jugador hace clic en **"Ready"**
3. Cuando **todos** están listos (mínimo 2 jugadores), el juego empieza automáticamente

### Fase 2: Preparación (10 segundos)
- Se selecciona **un jugador aleatorio** como **Seeker** (Buscador)
- Los demás son **Hiders** (Escondidos)

**Como Hider:**
- Verás: "🙈 HIDER - Hide quickly!"
- Tienes 10 segundos para alejarte y esconderte
- Tu personaje es de color **azul**
- Usa las **flechas** para moverte, **Shift** para correr

**Como Seeker:**
- Verás: "👁️ SEEKER - Wait here..."
- Debes esperar 10 segundos sin moverte
- Tu personaje es de color **rojo**
- El temporizador cuenta hacia atrás desde 10

### Fase 3: Seeking (2 minutos)
**¡Aquí empieza la acción!**

**Como Seeker (Buscador):**
1. El mensaje cambia a "SEEK!" o similar
2. Ahora **puedes moverte libremente**
3. Tu objetivo: **acercarte a los hiders**
4. **IMPORTANTE**: Para "encontrar" a un hider, debes **acercarte mucho** a él
   - Radio de detección: **1.5 unidades** (aproximadamente 2-3 pasos del personaje)
   - NO necesitas hacer nada especial, solo estar cerca
   - Cuando estés lo suficientemente cerca, se detectará automáticamente
   - Verás en la **consola del navegador** (F12): "🎯 FOUND PLAYER: [nombre]"
5. Cada vez que encuentras a alguien:
   - El hider se pone de color **gris**
   - Ganas **+10 puntos**
   - El contador de "Hiders Remaining" disminuye
6. Si encuentras a **todos** antes de que acabe el tiempo:
   - Ganas **+20 puntos extra**
   - La ronda termina inmediatamente

**Como Hider (Escondido):**
1. Sigue escondiéndote y alejándote del seeker
2. Si el seeker se acerca mucho a ti:
   - Te "atrapa" automáticamente
   - Tu personaje se pone **gris**
   - Ya no puedes obtener puntos
   - Verás: "You were found! 😢"
3. Si sobrevives los 2 minutos sin ser encontrado:
   - Ganas **+5 puntos**

### Fase 4: Fin de Ronda
- Se muestra el **scoreboard** con todos los jugadores
- Los puntos se muestran ordenados de mayor a menor
- Después de **5 segundos**, vuelve automáticamente al lobby
- Los jugadores pueden jugar otra ronda

## 🎯 Sistema de Puntuación

### Seeker (Buscador):
- **+10 puntos** por cada hider encontrado
- **+20 puntos bonus** si encuentra a todos antes del tiempo límite
- **0 puntos** si el tiempo se acaba sin encontrar a todos

### Hiders (Escondidos):
- **+5 puntos** si sobreviven hasta el final
- **0 puntos** si son encontrados

### Ejemplo de Partida:
```
Jugadores: Alice (Seeker), Bob (Hider), Charlie (Hider)

Resultado:
- Alice encuentra a Bob → Alice: +10
- Charlie sobrevive hasta el final → Charlie: +5
- Tiempo agotado
- Alice NO encuentra a todos → Alice: no bonus

Puntuación final:
1. Alice: 10 puntos
2. Charlie: 5 puntos
3. Bob: 0 puntos
```

## 🕹️ Controles

| Tecla | Acción |
|-------|--------|
| **↑** | Mover hacia adelante |
| **↓** | Mover hacia atrás |
| **←** | Girar izquierda |
| **→** | Girar derecha |
| **Shift** | Correr (velocidad x2.4) |
| **Espacio** | Saltar |
| **D** | Toggle debug mode (ver wireframes) |

## 🎨 Indicadores Visuales

### Colores de Personajes:
- 🔴 **Rojo**: Seeker (buscador)
- 🔵 **Azul**: Hider activo (aún no encontrado)
- ⚫ **Gris**: Hider capturado

### Indicadores en Pantalla:
- **Esfera flotante**: Sobre cada jugador, color según rol
- **Anillo en el suelo**: Alrededor de cada jugador para mejor visibilidad
- **Tu rol**: Indicador grande arriba en el centro
- **Temporizador**: Centro superior, muestra tiempo restante
- **Puntuaciones**: Panel derecho, muestra puntos en tiempo real
- **Hiders restantes**: (Solo para seeker) Abajo en el centro

## 🔧 Cómo Detectar Colisiones

### Para Verificar si Funciona:
1. Abre la **consola del navegador** (Presiona F12)
2. Pestaña **Console**
3. Cuando el seeker se acerque a un hider, verás:
   ```
   🎯 FOUND PLAYER: Player_2 at distance 1.23
   ```

### Troubleshooting:
**Si no se detectan los jugadores:**
1. Verifica que estés en la fase "seeking" (no "preparation")
2. Verifica que seas el seeker (personaje rojo)
3. Acércate MÁS - necesitas estar a menos de 1.5 unidades
4. Mira la consola para ver mensajes de debug
5. Verifica que el servidor esté corriendo

**Si el hider no se pone gris:**
1. Verifica que el servidor haya recibido el evento
2. Mira la consola del servidor para ver logs
3. Verifica que la conexión WebSocket esté activa

## 📊 Información Técnica

### Parámetros de Detección:
```javascript
collisionThreshold = 1.5 // unidades de distancia
cooldownDuration = 2000  // 2 segundos entre detecciones
```

### Fases del Juego:
```
lobby → preparation (10s) → seeking (120s) → roundEnd (5s) → lobby
```

### Tiempos:
- Preparación: 10 segundos
- Búsqueda: 2 minutos (120 segundos)
- Scoreboard: 5 segundos

## 💡 Tips y Estrategias

### Para Hiders:
- ✅ Usa los 10 segundos de preparación para alejarte lo máximo posible
- ✅ Escóndete detrás de edificios
- ✅ Mantente en movimiento
- ✅ Usa Shift para correr más rápido
- ❌ No te quedes en espacios abiertos
- ❌ No te acerques al spawn point

### Para Seeker:
- ✅ Memoriza donde viste a los hiders durante la preparación
- ✅ Busca sistemáticamente (no al azar)
- ✅ Usa Shift para correr y cubrir más terreno
- ✅ Revisa detrás de edificios y esquinas
- ✅ Acércate mucho a los hiders para detectarlos
- ❌ No pierdas tiempo buscando en el mismo lugar

## 🐛 Debugging

### Consola del Cliente (F12):
```javascript
// Conexión establecida
Connected to server: [socketId]

// Cambio de fase
Phase changed: seeking - Seeking phase started! Seeker can now hunt!

// Jugador encontrado
🎯 FOUND PLAYER: Player_2 at distance 1.23

// Jugador capturado
Player Player_2 was caught! 1 hiders remaining
```

### Consola del Servidor:
```javascript
// Ronda iniciada
Round 1 starting - Seeker: Player_1

// Fase de búsqueda
Seeking phase started

// Jugador encontrado
Player_2 was found by Player_1

// Ronda terminada
Round 1 ended: timeUp
```

## ❓ FAQ

**P: ¿Cuántos jugadores se necesitan?**
R: Mínimo 2 jugadores.

**P: ¿Cuántos seekers hay?**
R: Solo 1 seeker por ronda.

**P: ¿Se rota el seeker?**
R: Sí, se selecciona aleatoriamente cada ronda.

**P: ¿Qué pasa si el seeker se desconecta?**
R: La ronda termina y todos vuelven al lobby.

**P: ¿Los puntos son acumulativos?**
R: Sí, los puntos se mantienen durante toda la sesión.

**P: ¿Hay límite de rondas?**
R: No, pueden jugar infinitas rondas.

**P: ¿Puedo ver otros jugadores a través de paredes?**
R: Sí, los modelos 3D se renderizan siempre. En el futuro podríamos agregar oclusión.

---

¡Diviértete jugando al escondite! 🎮👾
