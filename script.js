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

// Variable global para guardar el código actual renderizado en el iframe
let currentRenderedCode = "";

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
        const response = await fetch('http://127.0.0.1:11434/api/tags', { mode: 'cors' });
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

// Event Carga inicial (Lógica para determinar desde qué sesión abrimos)
document.addEventListener('DOMContentLoaded', () => {
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
function updateSandbox(text) {
    const regex = /```(html|css|javascript|js)?\s*([\s\S]*?)```/gi;
    
    let html = '';
    let css = '';
    let js = '';
    
    let match;
    while ((match = regex.exec(text)) !== null) {
        const lang = match[1] ? match[1].toLowerCase() : '';
        let code = match[2];
        
        // Limpieza extra obligatoria por si el modelo escapó la palabra clave dentro del bloque
        code = code.replace(/^(html|css|javascript|js)\s*/i, '');
        
        if (lang === 'html') {
            html += code + '\n';
        } else if (lang === 'css') {
            css += code + '\n';
        } else if (lang === 'javascript' || lang === 'js') {
            js += code + '\n';
        } else {
            // Un bloque genérico sin lenguaje
            if (code.includes('<html') || code.includes('<div') || code.includes('<body')) {
                html += code + '\n';
            } else if (code.includes('{') && code.includes(':')) {
                 css += code + '\n';
            }
        }
    }
    
    // En cuanto haya estructura, la ensamblamos al srcdoc de tiempo real
    if (html.trim() || css.trim() || js.trim()) {
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
        
        // Guardar para la funcionalidad de "Nueva Pestaña"
        currentRenderedCode = combinedCode;
        
        // Inyectar
        sandboxIframe.srcdoc = combinedCode;
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
// Al enviar prompt: Petición POST a la API /api/generate
// ==========================================
sendButton.addEventListener('click', async () => {
    
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
    
    // Desactivar temporalmente controles
    sendButton.disabled = true;
    sendButton.textContent = '⏳ Escribiendo...';
    sendButton.style.backgroundColor = 'var(--text-secondary)';
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
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) throw new Error('Error en la comunicación con la API (status no ok).');
        
        const data = await response.json();
        const aiResponseText = data.message.content; // Cambio de response -> message.content
        
        // 3. Mostrar la respuesta real de la IA
        aiMsgDiv.textContent = aiResponseText;
        
        // 4. Analizar, limpiar e inyectar el código en tiempo real
        updateSandbox(aiResponseText);
        
        // 4.1 Guardar el código actual en la sesión activa y registrar mensaje en la memoria global
        saveCodeToSession();
        saveMessage(aiResponseText, 'assistant');
        
    } catch (error) {
        console.error('Error durante la solicitud a Ollama:', error);
        aiMsgDiv.textContent = '❌ Hubo un error al procesar tu solicitud. Verifica que Ollama esté corriendo de fondo. CORS en File:// u Ollama Origins podrían causar un problema también.';
        aiMsgDiv.style.color = '#ff7b72'; // Color rojizo de error en terminal
    } finally {
        // Restaurar estado visual y funcionalidad de botones
        sendButton.disabled = false;
        sendButton.textContent = 'Enviar';
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
        
        const response = await fetch('http://127.0.0.1:11434/api/pull', {
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
