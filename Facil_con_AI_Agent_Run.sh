#!/bin/bash

# ======================================================
#           INICIANDO: FACIL CON AI AGENT
#           Lanzador para macOS y Linux
# ======================================================

# Colores para la terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

echo -e "${CYAN}======================================================"
echo -e "          INICIANDO: FACIL CON AI AGENT"
echo -e "======================================================${NC}"

# -------------------------------------------------------
# 1. VERIFICAR SI OLLAMA ESTÁ INSTALADO
# -------------------------------------------------------
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}[!] Ollama no detectado. Instalando...${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: intentar instalar con Homebrew
        if command -v brew &> /dev/null; then
            echo -e "${CYAN}[→] Instalando Ollama con Homebrew...${NC}"
            brew install ollama
        else
            echo -e "${RED}[!] Homebrew no encontrado.${NC}"
            echo -e "${YELLOW}    Por favor instala Ollama manualmente desde: https://ollama.com/download${NC}"
            echo -e "${YELLOW}    Luego vuelve a ejecutar este script.${NC}"
            open "https://ollama.com/download" 2>/dev/null || true
            exit 1
        fi
    else
        # Linux: instalador oficial
        echo -e "${CYAN}[→] Instalando Ollama en Linux...${NC}"
        curl -fsSL https://ollama.com/install.sh | sh
    fi
else
    echo -e "${GREEN}[OK] Ollama detectado.${NC}"
fi

# -------------------------------------------------------
# 2. DETENER OLLAMA SI YA ESTÁ CORRIENDO
# -------------------------------------------------------
echo -e "${YELLOW}[!] Reiniciando motor con permisos de interfaz...${NC}"
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

# -------------------------------------------------------
# 3. CONFIGURAR CORS Y ARRANCAR OLLAMA EN SEGUNDO PLANO
# -------------------------------------------------------
export OLLAMA_ORIGINS="*"

# Arrancar en segundo plano y guardar el PID
ollama serve &> /tmp/ollama_facil_ai.log &
OLLAMA_PID=$!
echo -e "${GREEN}[OK] Ollama iniciado (PID: $OLLAMA_PID)${NC}"

# -------------------------------------------------------
# 4. ESPERAR A QUE EL SERVIDOR DESPIERTE
# -------------------------------------------------------
echo -e "${YELLOW}[!] Esperando 5 segundos a que la IA despierte...${NC}"
sleep 5

# Verificar que Ollama responde
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Servidor de IA activo y respondiendo.${NC}"
else
    echo -e "${RED}[!] Ollama no responde aún. Puede tardar un poco más.${NC}"
fi

# -------------------------------------------------------
# 5. ABRIR LA INTERFAZ EN EL NAVEGADOR
# -------------------------------------------------------
echo -e "${YELLOW}[!] Lanzando Fácil con AI Agent en el navegador...${NC}"

# Obtener la ruta absoluta del directorio donde está el script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX_PATH="${SCRIPT_DIR}/index.html"

if [[ "$OSTYPE" == "darwin"* ]]; then
    open "${INDEX_PATH}"
elif command -v xdg-open &> /dev/null; then
    xdg-open "${INDEX_PATH}"
elif command -v gnome-open &> /dev/null; then
    gnome-open "${INDEX_PATH}"
else
    echo -e "${RED}[!] No se pudo abrir el navegador automáticamente.${NC}"
    echo -e "${YELLOW}    Abre manualmente este archivo en tu navegador:${NC}"
    echo -e "    ${INDEX_PATH}"
fi

echo -e "${CYAN}======================================================"
echo -e "  ¡LISTO! Ya puedes usar tus modelos en el navegador."
echo -e "  Ollama corre en segundo plano (PID: $OLLAMA_PID)"
echo -e "  Para detenerlo: kill $OLLAMA_PID"
echo -e "======================================================${NC}"

# Mantener el script activo para que Ollama no se detenga al cerrar la terminal
# (opcional: comenta la siguiente línea si prefieres que corra completamente en background)
wait $OLLAMA_PID
