# 🤖 Fácil con AI Agent

<p align="center">
  <img src="logo.png" alt="Fácil con AI Agent Logo" width="120"/>
</p>

<p align="center">
  <strong>Tu estudio de desarrollo local, impulsado por IA — 100% privado, sin suscripciones, sin nube.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Ollama-compatible-blueviolet?style=flat-square" />
  <img src="https://img.shields.io/badge/Python-Pyodide-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white" />
  <img src="https://img.shields.io/badge/offline-100%25-success?style=flat-square" />
</p>

---

## ¿Qué es?

**Fácil con AI Agent** es una interfaz de chat local que conecta con tus modelos de IA instalados en [Ollama](https://ollama.com), directamente desde el navegador. Escribe una instrucción, y la IA genera código que se previsualiza al instante en un **Sandbox** interactivo — sin enviar nada a servidores externos.

---

## ✨ Características

- 💬 **Chat con contexto** — historial de conversación completo por sesión
- ⚡ **Sandbox en tiempo real** — previsualiza HTML, CSS y JavaScript al instante
- 🐍 **Ejecución de Python** — corre scripts Python directamente en el navegador con Pyodide
- 🗂️ **Múltiples sesiones** — guarda y retoma conversaciones desde el sidebar
- 📎 **Adjuntos** — sube imágenes o archivos de texto como contexto para la IA
- 🔗 **Lectura de enlaces** — extrae el contenido de URLs para enriquecer el prompt
- 📦 **Exportar proyecto** — descarga el resultado como `.html` o como `.zip` con archivos separados
- 🔍 **Gestor de modelos** — instala, visualiza y elimina modelos de Ollama sin salir del app
- 🔒 **100% local y privado** — ningún dato sale de tu máquina

---

## 🚀 Inicio rápido en macOS

### Paso 1 — Descarga un modelo de IA

Si ya tienes Ollama instalado, abre la Terminal y ejecuta:

```bash
ollama pull llama3
```

> Si aún no tienes Ollama, no te preocupes — el lanzador lo instala automáticamente en el siguiente paso.

---

### Paso 2 — Dale permisos al lanzador (solo la primera vez)

Abre la **Terminal** y ejecuta:

```bash
chmod +x Facil_con_AI_Agent_Run.command
```

---

### Paso 3 — Lanza la aplicación

**Doble clic** sobre `Facil_con_AI_Agent_Run.command` desde el Finder.

Se abrirá una Terminal y el lanzador automáticamente:
- Verifica e instala Ollama si no lo tienes
- Configura los permisos CORS de forma permanente (`OLLAMA_ORIGINS=*`)
- Inicia Ollama en segundo plano
- Abre `index.html` en tu navegador predeterminado

> Mantén la ventana de Terminal abierta (puedes minimizarla). Ollama se detiene si la cierras.

---

### Modo manual

Si prefieres arrancar todo a mano desde Terminal:

```bash
export OLLAMA_ORIGINS="*"
ollama serve &
sleep 5
open index.html
```

---

## 📁 Estructura del proyecto

```
facil-con-ai-agent/
├── index.html                          # Interfaz principal
├── style.css                           # Estilos de la aplicación
├── script.js                           # Lógica del chat, sandbox y gestor
├── logo.png                            # Logo de la app
└── Facil_con_AI_Agent_Run.command      # Lanzador para macOS (doble clic)
```

---

## 🧩 Dependencias externas (cargadas por CDN)

| Librería | Uso |
|---|---|
| [Pyodide v0.25](https://pyodide.org) | Ejecución de Python en el navegador |
| [JSZip 3.10](https://stuk.github.io/jszip/) | Empaquetado de proyectos en `.zip` |
| [Microlink API](https://microlink.io) | Extracción de contenido de URLs |

---

## 🔧 Modelos recomendados

| Modelo | Uso ideal | Comando |
|---|---|---|
| `llama3` | Chat general y código | `ollama pull llama3` |
| `deepseek-coder` | Código y programación | `ollama pull deepseek-coder` |
| `mistral` | Rápido y eficiente | `ollama pull mistral` |
| `phi3` | Ligero, ideal para Macs con menos RAM | `ollama pull phi3` |

---

## ❓ Preguntas frecuentes

**Me sale "no se puede abrir porque es de un desarrollador no identificado"**  
Haz clic derecho sobre `Facil_con_AI_Agent_Run.command` → **Abrir** → **Abrir de todas formas**. Solo se pide la primera vez.

**¿Por qué el selector dice "Ollama inactivo"?**  
Asegúrate de que la Terminal del lanzador siga abierta. El lanzador configura `OLLAMA_ORIGINS=*` automáticamente, que es necesario para que el navegador se conecte.

**¿Puedo cerrar la Terminal después de lanzar?**  
No — Ollama corre mientras la Terminal esté abierta. Puedes minimizarla sin problema. Para detener Ollama simplemente cierra esa ventana cuando termines.

**¿Mis conversaciones se guardan en la nube?**  
No. Todo se guarda en el `localStorage` de tu navegador, localmente en tu Mac.

**¿Puedo instalar modelos desde la app?**  
Sí. Usa el campo "Instalar" en el header, escribe el nombre del modelo (ej: `gemma3`) y haz clic en 🚀 Instalar.

---

## 📄 Licencia

MIT — libre para usar, modificar y distribuir.

---

<p align="center">Hecho con ❤️ para la comunidad hispanohablante de IA local</p>
