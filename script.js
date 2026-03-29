// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const modelSelect = document.getElementById('modelSelect');
const chatHistory = document.getElementById('chatHistory');
const chatForm = document.getElementById('chatForm');
const promptInput = document.getElementById('promptInput');
const sendButton = document.getElementById('sendButton');
const sandboxIframe = document.getElementById('sandboxIframe');
const downloadCodeBtn = document.getElementById('downloadCodeBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const openNewTabBtn = document.getElementById('openNewTabBtn');

// Referencias Adjuntos
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const attachmentPreview = document.getElementById('attachmentPreview');
let currentAttachment = null; // Guardará el objeto de estado del archivo

// Referencias del Sidebar / Historial
const menuToggleBtn = document.getElementById('menuToggleBtn');
const sidebar = document.getElementById('sidebar');
const newChatBtn = document.getElementById('newChatBtn');
const sessionList = document.getElementById('sessionList');

// Referencias del Instalador
const installBtn = document.getElementById('installBtn');
const modelInstallInput = document.getElementById('modelInstallInput');
const installerStatus = document.getElementById('installerStatus');

// Referencias para el panel redimensionable (Split Screen)
const resizer = document.getElementById('dragMe');
const leftSide = document.getElementById('leftPanel');
const rightSide = document.getElementById('rightPanel');

// Referencias Gestor de Modelos
const openModelManagerBtn = document.getElementById('openModelManagerBtn');
const closeModelManagerBtn = document.getElementById('closeModelManagerBtn');
const modelManagerModal = document.getElementById('model-manager-modal');
const modelList = document.getElementById('model-list');

// Variable global para guardar el código actual renderizado en el iframe
let currentRenderedCode = "";
const pythonOutput = document.getElementById('python-output');
let pyodideInstance = null; // Instancia global de Pyodide

// Variable para guardar la última respuesta completa de la IA (para empaquetar en ZIP)
let lastAiResponse = "";

// Para controlar la cancelación de peticiones
let currentAbortController = null;
let isProcessingResponse = false;

// ==========================================
// LÓGICA DE SPLIT SCREEN (División Deslizable)
// ==========================================
let x = 0; // Posición X del ratón al presionar clic
let leftWidth = 0; // Ancho inicial del panel izquierdo

const mouseDownHandler = function(e) {
    // Obtener la posición inicial del puntero
    x = e.clientX;
    // Obtener el ancho actual del elemento izquierdo
    leftWidth = leftSide.getBoundingClientRect().width;
    
    // Adjuntar los eventos correspondientes a todo el documento
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
};

const mouseMoveHandler = function(e) {
    // Calculamos qué tanto se movió el puntero (delta x)
    const dx = e.clientX - x;
    
    // Obtenemos el ancho total del contenedor (padre de los paneles)
    const containerWidth = resizer.parentNode.getBoundingClientRect().width;
    
    // Calculamos el nuevo porcentaje base en el nuevo ancho del panel izquierdo
    const newLeftWidthPercent = ((leftWidth + dx) * 100) / containerWidth;
    
    // Ponemos límites estéticos: que los paneles no sean menores al 10%
    if (newLeftWidthPercent > 10 && newLeftWidthPercent < 90) {
        leftSide.style.flex = `1 1 ${newLeftWidthPercent}%`;
        rightSide.style.flex = `1 1 ${100 - newLeftWidthPercent}%`;
    }
    
    // IMPORTANTE: Evitamos que el IFrame interfiera con los eventos del ratón bloqueando los clicks temporalmente
    sandboxIframe.style.pointerEvents = 'none';
};

const mouseUpHandler = function() {
    // Limpiamos los eventos al soltar el botón
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    
    // Devolvemos la interactividad estándar al iframe
    sandboxIframe.style.pointerEvents = 'auto';
};

// Adjuntamos el evento de inicio al redimensionador
resizer.addEventListener('mousedown', mouseDownHandler);

// ==========================================
// AUTO-DETECCIÓN DE MODELOS
// Hace petición GET de los modelos disponibles en Ollama
// ==========================================
async function fetchModels() {
    try {
        const response = await fetch('http://localhost:11434/api/tags', { mode: 'cors' });
        if (!response.ok) throw new Error('Ocurrió un problema conectando con Ollama');
        
        const data = await response.json();
        
        // Limpiar el selector
        modelSelect.innerHTML = '';
        
        // Verificar que existan modelos cargados en local
        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                // Si el modelo es "llama2" o u otro, podemos intentar seleccionarlo por defecto, pero dejemos el primero
                modelSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.textContent = 'No hay modelos en Ollama. Descarga uno.';
            modelSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error al detectar los modelos locales de IA:', error);
        modelSelect.innerHTML = '<option value="">Ollama inactivo o sin conexión</option>';
    }
}

// Inicializamos la búsqueda de modelos cuando carga el script
fetchModels();

// ==========================================
// FUNCIONES AUXILIARES PARA EL CHAT, SIDEBAR E HISTORIAL
// ==========================================

// Variable global estado sesión
let currentSessionId = localStorage.getItem('currentSessionId');

// Abrir/Cerrar la barra lateral
menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

function getChatSessions() {
    return JSON.parse(localStorage.getItem('chatSessions')) || [];
}

function saveChatSessions(sessions) {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
}

function createNewSession() {
    const d = new Date();
    const newSession = {
        id: Date.now().toString(),
        title: `Sesión local ${d.getHours()}:${d.getMinutes()}`,
        messages: [],
        renderedCode: ""
    };
    
    let sessions = getChatSessions();
    sessions.push(newSession);
    saveChatSessions(sessions);
    
    loadSession(newSession.id);
    return newSession.id;
}

newChatBtn.addEventListener('click', () => {
    createNewSession();
});

function loadSession(id) {
    currentSessionId = id;
    localStorage.setItem('currentSessionId', id);
    
    const sessions = getChatSessions();
    const session = sessions.find(s => s.id === id);
    
    // Limpiar UI visual
    chatHistory.innerHTML = '';
    
    // Remontar el chat
    if (session && session.messages) {
        session.messages.forEach(m => {
            const content = m.content || m.text;
            const role = m.role || (m.sender === 'user' ? 'user' : 'assistant');
            addMessageToChatVisual(content, role === 'user' ? 'user' : 'ai');
        });
        currentRenderedCode = session.renderedCode || "";
        sandboxIframe.removeAttribute('srcdoc');
        sandboxIframe.srcdoc = currentRenderedCode;
    } else {
        currentRenderedCode = "";
        sandboxIframe.removeAttribute('srcdoc');
        sandboxIframe.srcdoc = "";
    }
    
    renderSessionList();
}

function renderSessionList() {
    // Ordenar para mostrar lo más reciente arriba
    const sessions = getChatSessions().slice().reverse(); 
    sessionList.innerHTML = '';
    
    sessions.forEach(s => {
        const div = document.createElement('div');
        div.classList.add('session-item');
        if (s.id === currentSessionId) {
            div.classList.add('active');
        }
        
        const spanTitle = document.createElement('span');
        spanTitle.textContent = s.title;
        spanTitle.title = s.title; // hover visual
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.classList.add('delete-session-btn');
        deleteBtn.title = 'Eliminar sesión';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el clic abra la sesión
            if (confirm('¿Seguro que deseas eliminar esta sesión localmente?')) {
                deleteSession(s.id);
            }
        });
        
        div.addEventListener('click', () => loadSession(s.id));
        
        div.appendChild(spanTitle);
        div.appendChild(deleteBtn);
        sessionList.appendChild(div);
    });
}

function deleteSession(id) {
    let sessions = getChatSessions();
    sessions = sessions.filter(s => s.id !== id);
    saveChatSessions(sessions);
    
    // Si borramos la que estamos viendo
    if (currentSessionId === id) {
        if (sessions.length > 0) {
            loadSession(sessions[0].id); // Mover a la primera disponible temporalmente
        } else {
            createNewSession();
        }
    } else {
        renderSessionList(); // Solo actualizar UI visual
    }
}

function saveMessage(content, role, images = null) {
    const sessions = getChatSessions();
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
        if (!session.messages) session.messages = [];
        
        const msgObj = { role, content };
        if (images && images.length > 0) msgObj.images = images;
        
        session.messages.push(msgObj);
        
        // Actualizar el título dinámico con el primer prompt del usuario
        if (session.messages.length >= 1 && role === 'user' && session.title.includes('Sesión local')) { 
            session.title = content.substring(0, 25) + '...';
        }
        
        saveChatSessions(sessions);
        renderSessionList(); // Refrescar menú lateral
    }
}

function saveCodeToSession() {
    const sessions = getChatSessions();
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
        session.renderedCode = currentRenderedCode;
        saveChatSessions(sessions);
    }
}

// Agregar un mensaje al historial visual en pantalla sin guardarlo en DB (Ayuda al loadSession)
function addMessageToChatVisual(text, senderType) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(senderType === 'user' ? 'user-msg' : 'ai-msg');
    
    msgDiv.textContent = text;
    chatHistory.appendChild(msgDiv);
    
    // Auto-scroll al fondo
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Agregar mensaje y guardar (por defecto para flujos nuevos)
function addMessageToChat(text, role) {
    addMessageToChatVisual(text, role === 'user' ? 'user' : 'ai');
    saveMessage(text, role);
}

// Inicialización de Pyodide al cargar la página
async function setupPyodide() {
    try {
        if (!pyodideInstance) {
            console.log("Inicializando Pyodide...");
            pyodideInstance = await loadPyodide();
            console.log("Pyodide listo.");
        }
    } catch (err) {
        console.error("Error al cargar Pyodide:", err);
    }
}

// Event Carga inicial (Lógica para determinar desde qué sesión abrimos)
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Pyodide en segundo plano
    setupPyodide();
    
    // Limpieza inicial para forzar a borrar lo que sea de BF-Cache de iframes
    currentRenderedCode = "";
    sandboxIframe.removeAttribute('srcdoc');
    sandboxIframe.srcdoc = "";
    
    // Si no hay chat anterior, crear uno
    let sessions = getChatSessions();
    if (!currentSessionId || sessions.length === 0) {
        createNewSession();
    } else {
        loadSession(currentSessionId);
    }
});

// Analizar la respuesta, limpiar etiquetas e inyectar en el Sandbox en tiempo real
async function updateSandbox(text) {
    // Regex mejorado para incluir python
    const regex = /```(html|css|javascript|js|python|py)?\s*([\s\S]*?)```/gi;
    
    let html = '';
    let css = '';
    let js = '';
    let python = '';
    
    let match;
    while ((match = regex.exec(text)) !== null) {
        const lang = match[1] ? match[1].toLowerCase() : '';
        let code = match[2];
        
        // Limpieza extra
        code = code.replace(/^(html|css|javascript|js|python|py)\s*/i, '');
        
        if (lang === 'html') {
            html += code + '\n';
        } else if (lang === 'css') {
            css += code + '\n';
        } else if (lang === 'javascript' || lang === 'js') {
            js += code + '\n';
        } else if (lang === 'python' || lang === 'py') {
            python += code + '\n';
        } else {
            // Un bloque genérico sin lenguaje
            if (code.includes('<html') || code.includes('<div') || code.includes('<body')) {
                html += code + '\n';
            } else if (code.includes('{') && code.includes(':')) {
                 css += code + '\n';
            }
        }
    }
    
    // Lógica de alternancia Web vs Python (Prioridad Web si existe estructura visual)
    if (html.trim() || css.trim() || js.trim()) {
        // Es un proyecto Web
        pythonOutput.classList.add('hidden');
        sandboxIframe.classList.remove('hidden');

        const combinedCode = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>${js}<\/script>
            </body>
            </html>
        `;
        
        currentRenderedCode = combinedCode;
        sandboxIframe.srcdoc = combinedCode;

    } else if (python.trim()) {
        // Es un proyecto Python puro o sin estructura Web
        sandboxIframe.classList.add('hidden');
        pythonOutput.classList.remove('hidden');
        
        pythonOutput.textContent = '⏳ Ejecutando script de Python...';

        if (!pyodideInstance) {
            pythonOutput.textContent = '⏳ Cargando motor de Python (Pyodide), por favor espera un momento...';
            await setupPyodide();
        }

        try {
            // Función para limpiar indentación excesiva común (dedent)
            function dedent(code) {
                const lines = code.split('\n');
                while (lines.length > 0 && lines[0].trim() === '') lines.shift();
                while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
                if (lines.length === 0) return '';
                const minIndent = lines.reduce((min, line) => {
                    if (line.trim() === '') return min;
                    const match = line.match(/^(\s*)/);
                    return Math.min(min, match[0].length);
                }, Infinity);
                return lines.map(line => line.slice(minIndent)).join('\n');
            }

            const cleanPython = dedent(python);

            // Redirigir stdout para capturar los print()
            pyodideInstance.setStdout({
                batched: (text) => {
                    if (pythonOutput.textContent.startsWith('⏳')) pythonOutput.textContent = '';
                    pythonOutput.textContent += text + '\n';
                    pythonOutput.scrollTop = pythonOutput.scrollHeight;
                }
            });

            await pyodideInstance.runPythonAsync(cleanPython);
        } catch (err) {
            pythonOutput.textContent += `\n❌ Error de Python:\n${err}`;
            pythonOutput.scrollTop = pythonOutput.scrollHeight;
        }
    }
}

// ==========================================
// ADJUNTAR ARCHIVOS (CLIP) Y VISTA PREVIA
// ==========================================
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;
    const fileName = file.name;

    if (fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const result = evt.target.result;
            // result = data:image/png;base64,.... Solo requerimos la raw base64 para Ollama
            const base64Data = result.split(',')[1];
            currentAttachment = { type: 'image', base64: base64Data, name: fileName };
            showAttachmentPreview(result, fileName);
        };
        reader.readAsDataURL(file);
    } else {
        // Documentos o código
        const reader = new FileReader();
        reader.onload = function(evt) {
            currentAttachment = { type: 'text', content: evt.target.result, name: fileName };
            showAttachmentPreview(null, fileName);
        };
        reader.readAsText(file);
    }
    
    // Para que el change se dispare siempre incluso si metemos el mismo archivo tras borrarlo.
    fileInput.value = '';
});

function showAttachmentPreview(imgSrc, fileName) {
    attachmentPreview.innerHTML = '';
    attachmentPreview.classList.remove('hidden');

    if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        attachmentPreview.appendChild(img);
    } else {
        const icon = document.createElement('span');
        icon.textContent = '📄';
        icon.style.fontSize = '1.5rem';
        attachmentPreview.appendChild(icon);
    }

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('filename');
    nameSpan.textContent = fileName;
    attachmentPreview.appendChild(nameSpan);

    const closeBtn = document.createElement('button');
    closeBtn.classList.add('close-preview-btn');
    closeBtn.textContent = '❌';
    closeBtn.title = "Quitar Adjunto";
    closeBtn.addEventListener('click', clearAttachment);
    attachmentPreview.appendChild(closeBtn);
}

function clearAttachment() {
    currentAttachment = null;
    fileInput.value = '';
    attachmentPreview.classList.add('hidden');
    attachmentPreview.innerHTML = '';
}

// ==========================================
// LÓGICA DE CONEXIÓN Y CHAT CON LA API OLLAMA
// Al enviar prompt: Petición POST a la API /api/chat
// ==========================================
sendButton.addEventListener('click', async () => {
    
    // Si ya estamos procesando, este botón ahora sirve para ABORTAR
    if (isProcessingResponse && currentAbortController) {
        currentAbortController.abort();
        console.log("Petición abortada por el usuario.");
        return;
    }

    const promptText = promptInput.value.trim();
    if (!promptText && !currentAttachment) return; // Permite envio vacío de texto si hay imagen/documento
    
    const selectedModel = modelSelect.value;
    if (!selectedModel) {
        alert('Por favor, selecciona un modelo. Asegúrate de que Ollama esté encendido.');
        return;
    }
    
    // 1. Mostrar el mensaje del usuario y limpiar el input y estado adjunto
    const userVisualText = promptText || '[Archivo Adjunto Enviado]';
    addMessageToChatVisual(userVisualText, 'user'); // SOLO VISTA, el guardado real en sesión se hace tras inyectar contexto
    promptInput.value = '';
    
    // Cambiar la altura del textarea a la por defecto
    promptInput.style.height = '45px';
    
    // 2. Colocar un placeholder mientras el sistema trabaja
    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.classList.add('message', 'ai-msg');
    aiMsgDiv.textContent = '⏳ Pensando...';
    
    chatHistory.appendChild(aiMsgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Activar estado de procesamiento y crear controlador de cancelación
    isProcessingResponse = true;
    currentAbortController = new AbortController();
    const { signal } = currentAbortController;

    // Cambiar visualmente el botón a "Detener"
    sendButton.textContent = '🛑 Detener';
    sendButton.title = 'Cancelar respuesta actual';
    sendButton.style.backgroundColor = '#ff7b72'; // Color de error/peligro
    
    promptInput.disabled = true;
    attachBtn.disabled = true;
    
    // Definir Prompts
    let finalPrompt = promptText;
    let finalImages = [];

    // LÓGICA DE EXTRACCIÓN DE ENLACE MEDIANTE PREVIEWS (API MICROLINK)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = promptText.match(urlRegex);
    
    if (matches && matches.length > 0) {
        const detectedUrl = matches[0];
        aiMsgDiv.textContent = '⏳ Leyendo enlace...';
        
        try {
            const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(detectedUrl)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    const linkTitle = data.data.title || "Sin título";
                    const linkDesc = data.data.description || "Sin descripción";
                    
                    finalPrompt = `${finalPrompt}\n\n[Contexto extraído del enlace: ${linkTitle} - ${linkDesc}]`;
                    aiMsgDiv.textContent = '⏳ Pensando... (Enlace asimilado)';
                } else {
                    aiMsgDiv.textContent = '⏳ Pensando...';
                }
            } else {
                aiMsgDiv.textContent = '⏳ Pensando...';
            }
        } catch (err) {
            console.warn('Fallo silencioso al leer el enlace con Microlink:', err);
            aiMsgDiv.textContent = '⏳ Pensando...'; // Falla silenciosa total, continúa sin romper flow
        }
    }
    
    // LÓGICA INYECCIÓN DE ADJUNTOS
    if (currentAttachment) {
        if (currentAttachment.type === 'text') {
            finalPrompt = `[Contenido del archivo adjunto: ${currentAttachment.name}]:\n${currentAttachment.content}\n\n${finalPrompt}`;
        } else if (currentAttachment.type === 'image') {
            finalImages.push(currentAttachment.base64);
        }
    }
    
    clearAttachment(); // Limpiamos para el siguiente turno ahora sí con la variable final inyectada

    // GUARDAR EL MENSAJE FINAL DEL USUARIO (CON TODO EL CONTEXTO Y ENLACES) EN LA SESIÓN
    saveMessage(finalPrompt, 'user', finalImages);
    
    // Obtener todo el array de mensajes de la sesión actual
    const currentSession = getChatSessions().find(s => s.id === currentSessionId);
    let sessionMessages = [];
    
    if (currentSession && currentSession.messages) {
        sessionMessages = currentSession.messages.map(m => {
            const msgObj = { 
                role: m.role || (m.sender === 'user' ? 'user' : 'assistant'), 
                content: m.content || m.text 
            };
            if (m.images) msgObj.images = m.images;
            return msgObj;
        });
    }

    // Inyectar el System Prompt como primer orden invisible para la API
    const systemPromptMessage = {
        role: "system",
        content: "Eres Fácil con AI Agent, un desarrollador experto. REGLAS CRÍTICAS:\n1- NUNCA digas que no tienes acceso a internet, que no puedes navegar o que no puedes leer enlaces. Asume que el sistema ya extrajo el texto relevante y te lo entregó incrustado.\n2- Si la información extraída del enlace es insuficiente (ejemplo, páginas privadas de Notion), simplemente di: 'He analizado el enlace pero parece estar protegido o vacío. ¿Podrías copiar y pegar el texto específico aquí para armar tu página?' sin mencionar limitaciones de IA.\n3- Si te piden una gráfica, usa Chart.js (cárgala vía CDN).\n4- Responde SIEMPRE empaquetando el código en bloques Markdown (```html, ```css, etc.)."
    };
    
    const apiMessages = [systemPromptMessage, ...sessionMessages];

    // Construir Petición Endpoint Chat
    const requestBody = { 
        model: selectedModel, 
        messages: apiMessages, 
        stream: false 
    };

    try {
        // Hacemos el request a Ollama apuntando explícitamente a /api/chat
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: signal // Usamos la señal del AbortController
        });
        
        if (!response.ok) throw new Error('Error en la comunicación con la API (status no ok).');
        
        const data = await response.json();
        const aiResponseText = data.message.content; // Cambio de response -> message.content
        
        // Guardar la respuesta completa para el empaquetado ZIP inteligente
        lastAiResponse = aiResponseText;
        
        // 3. Mostrar la respuesta real de la IA
        aiMsgDiv.textContent = aiResponseText;
        
        // 4. Analizar, limpiar e inyectar el código en tiempo real
        await updateSandbox(aiResponseText);
        
        // 4.1 Guardar el código actual en la sesión activa y registrar mensaje en la memoria global
        saveCodeToSession();
        saveMessage(aiResponseText, 'assistant');
        
    } catch (error) {
        if (error.name === 'AbortError') {
            aiMsgDiv.textContent = '🛑 Petición detenida por el usuario.';
            aiMsgDiv.style.color = 'var(--text-secondary)';
        } else {
            console.error('Error durante la solicitud a Ollama:', error);
            aiMsgDiv.textContent = '❌ Hubo un error al procesar tu solicitud. Verifica que Ollama esté corriendo de fondo. CORS en File:// u Ollama Origins podrían causar un problema también.';
            aiMsgDiv.style.color = '#ff7b72'; // Color rojizo de error en terminal
        }
    } finally {
        // Restaurar estado visual y funcionalidad de botones
        isProcessingResponse = false;
        currentAbortController = null;

        sendButton.disabled = false;
        sendButton.textContent = 'Enviar';
        sendButton.title = '';
        sendButton.style.backgroundColor = ''; // Retorna a estilos via CSS
        promptInput.disabled = false;
        attachBtn.disabled = false;
        promptInput.focus();
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});

// ==========================================
// Instalador de Inteligencias (/api/pull)
// ==========================================
installBtn.addEventListener('click', async () => {
    const modelName = modelInstallInput.value.trim();
    if (!modelName) {
        installerStatus.textContent = 'Por favor, ingresa el nombre de un modelo válido.';
        installerStatus.style.color = '#ff7b72';
        return;
    }
    
    // Feedback: Conectando...
    installerStatus.textContent = '⏳ Conectando...';
    installerStatus.style.color = 'var(--text-secondary)';
    installBtn.disabled = true;
    modelInstallInput.disabled = true;
    
    try {
        // Feedback secundario: Descargando
        // Puesto que es stream false, la promesa no se resuelve hasta que finaliza la descarga de todo el tamaño
        installerStatus.textContent = '📥 Descargando... (esto puede tardar varios minutos dependiendo de tu conexión y del modelo)';
        
        const response = await fetch('http://localhost:11434/api/pull', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: modelName, stream: false })
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        // ¡Éxito!
        installerStatus.textContent = '✅ ¡Modelo instalado con éxito!';
        installerStatus.style.color = '#3fb950'; // Color verde
        modelInstallInput.value = '';
        
        // Refrescar el selector para que aparezca el nuevo modelo automáticamente
        fetchModels();
        
    } catch (error) {
        console.error('Error al instalar modelo:', error);
        installerStatus.textContent = '❌ Error al instalar el modelo. Verifica el nombre o la conexión con Ollama.';
        installerStatus.style.color = '#ff7b72';
    } finally {
        installBtn.disabled = false;
        modelInstallInput.disabled = false;
    }
});

// ==========================================
// FUNCIÓN: DESCARGAR CÓDIGO RENDERIZADO COMO HTML
// ==========================================
downloadCodeBtn.addEventListener('click', () => {
    if (!currentRenderedCode) {
        alert('El Sandbox está vacío. Debes generar contenido primero usando a tu IA local.');
        return;
    }
    
    // Crear el archivo en memoria (Blob) especificando que es HTML
    const blob = new Blob([currentRenderedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Crear un elemento <a> efímero para simular el click de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mi_proyecto_ia.html'; // Nombre por defecto
    
    // Inyectarlo, invocar click y limpiarlo
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Liberar memoria
    URL.revokeObjectURL(url);
});

// ==========================================
// FUNCIÓN: DESCARGAR CÓDIGO COMO PROYECTO .ZIP (JSZip Inteligente)
// ==========================================
downloadZipBtn.addEventListener('click', () => {
    if (!lastAiResponse) {
        alert('No hay código generado para empaquetar. Por favor, realiza una consulta primero.');
        return;
    }

    try {
        const zip = new JSZip();
        
        // Expresión regular para detectar bloques de código Markdown: ```lenguaje código ```
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        let fileCount = 0;

        while ((match = regex.exec(lastAiResponse)) !== null) {
            const lang = (match[1] || '').toLowerCase();
            const code = match[2];
            let fileName = '';

            // Asignar nombre de archivo según el lenguaje detectado en el bloque
            switch (lang) {
                case 'html':
                case 'xml':
                    fileName = 'index.html';
                    break;
                case 'css':
                    fileName = 'style.css';
                    break;
                case 'javascript':
                case 'js':
                    fileName = 'script.js';
                    break;
                case 'python':
                case 'py':
                    fileName = 'main.py';
                    break;
                case 'json':
                    fileName = 'data.json';
                    break;
                default:
                    // Si no tiene lenguaje o es desconocido, crear un archivo de texto numerado
                    fileName = `archivo_texto_${fileCount + 1}.txt`;
                    break;
            }

            // Añadir el archivo al ZIP (JSZip maneja automáticamente nombres duplicados si fuera necesario, 
            // pero aquí sobreescribirá si hay varios bloques del mismo tipo, lo cual es aceptable para un MVP)
            zip.file(fileName, code.trim());
            fileCount++;
        }

        if (fileCount === 0) {
            alert('No se detectaron bloques de código válidos en la respuesta para empaquetar.');
            return;
        }

        // Generar y descargar el ZIP
        zip.generateAsync({ type: "blob" }).then(function(content) {
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Proyecto_Facil_con_AI.zip";
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log(`ZIP generado con éxito: ${fileCount} archivos incluidos.`);
        });

    } catch (error) {
        console.error('Error al generar el archivo ZIP:', error);
        alert('Hubo un error intentando comprimir tu proyecto.');
    }
});

// ==========================================
// FUNCIÓN: ABRIR CÓDIGO RENDERIZADO EN PESTAÑA NUEVA
// ==========================================
openNewTabBtn.addEventListener('click', () => {
    if (!currentRenderedCode) {
        alert('El Sandbox está vacío. Debes generar contenido primero usando a tu IA local.');
        return;
    }
    
    // Abrimos un tab en blanco
    const newWindow = window.open();
    if (newWindow) {
        // Documentamos e inyectamos el código actual completo
        newWindow.document.open();
        newWindow.document.write(currentRenderedCode);
        newWindow.document.close();
    } else {
        alert('Tu navegador bloqueó el popup emergente. Por favor permítelo para esta acción.');
    }
});

// ==========================================
// UX Formulario: Permitir Enter para enviar, y Shift+Enter para agregar salto de línea
// ==========================================
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!e.shiftKey) {
            e.preventDefault(); // Evitamos que ponga un enter en el text area natural e invocamos el envío
            sendButton.click();
        }
    }
});

// Adaptación automática simple de la altura de la caja de texto
promptInput.addEventListener('input', function() {
    this.style.height = '45px'; // Reinicio básico de tamaño
    this.style.height = (this.scrollHeight) + 'px'; // Expandir según nivel del texto
});

// ==========================================
// GESTOR DE MODELOS (MODAL)
// ==========================================

// Abrir modal
openModelManagerBtn.addEventListener('click', () => {
    modelManagerModal.classList.remove('hidden');
    loadModels();
});

// Cerrar modal
closeModelManagerBtn.addEventListener('click', () => {
    modelManagerModal.classList.add('hidden');
});

// Cerrar al hacer clic fuera del contenido
window.addEventListener('click', (e) => {
    if (e.target === modelManagerModal) {
        modelManagerModal.classList.add('hidden');
    }
});

/**
 * Carga los modelos instalados desde la API de Ollama y los muestra en el modal
 */
async function loadModels() {
    modelList.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">Cargando modelos...</p>';

    try {
        const response = await fetch('http://localhost:11434/api/tags', { mode: 'cors' });
        if (!response.ok) throw new Error('No se pudo conectar con Ollama');

        const data = await response.json();
        modelList.innerHTML = '';

        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                // Convertir bytes a GB (1024^3)
                const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
                
                const li = document.createElement('li');
                li.className = 'model-item';
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'model-info';
                infoDiv.innerHTML = `
                    <span class="model-name">${model.name}</span>
                    <span class="model-size">${sizeGB} GB</span>
                `;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-model-btn';
                deleteBtn.innerHTML = '🗑️ Eliminar';
                deleteBtn.addEventListener('click', () => deleteModel(model.name));
                
                li.appendChild(infoDiv);
                li.appendChild(deleteBtn);
                modelList.appendChild(li);
            });
        } else {
            modelList.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">No tienes modelos instalados.</p>';
        }
    } catch (error) {
        console.error('Error al cargar modelos:', error);
        modelList.innerHTML = '<p style="padding: 20px; color: #ff7b72;">Error al cargar la lista de modelos. Asegúrate de que Ollama esté activo.</p>';
    }
}

/**
 * Elimina un modelo de Ollama tras confirmación del usuario
 */
async function deleteModel(modelName) {
    const confirmed = confirm(`¿Estás completamente seguro de que deseas eliminar el modelo ${modelName}? Esta acción no se puede deshacer y liberará espacio en tu disco.`);
    
    if (!confirmed) return;

    try {
        const response = await fetch('http://localhost:11434/api/delete', {
            method: 'DELETE',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });

        if (response.ok) {
            alert(`¡El modelo ${modelName} ha sido eliminado con éxito!`);
            loadModels(); // Recargar lista
            fetchModels(); // Actualizar selector del header también
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al eliminar el modelo');
        }
    } catch (error) {
        console.error('Error al eliminar modelo:', error);
        alert('Hubo un error al intentar eliminar el modelo: ' + error.message);
    }
}
