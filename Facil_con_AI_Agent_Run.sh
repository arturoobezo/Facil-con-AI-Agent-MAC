#!/bin/bash
# ======================================================
#           INICIANDO: FACIL CON AI AGENT (macOS)
# ======================================================

# Colores para la terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo "======================================================"
echo "          INICIANDO: FACIL CON AI AGENT"
echo "======================================================"

# ── 1. VERIFICAR SI OLLAMA ESTÁ INSTALADO ──────────────
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}[!] Ollama no detectado. Descargando instalador...${NC}"
    
    # Descargar el instalador oficial para Mac
    curl -L https://ollama.com/download/Ollama-darwin.zip -o /tmp/Ollama-darwin.zip
    
    echo -e "${YELLOW}[!] Descomprimiendo...${NC}"
    unzip -q /tmp/Ollama-darwin.zip -d /tmp/ollama_install
    
    echo -e "${YELLOW}[!] Moviendo Ollama a /Applications...${NC}"
    mv /tmp/ollama_install/Ollama.app /Applications/ 2>/dev/null || true
    
    rm -rf /tmp/Ollama-darwin.zip /tmp/ollama_install
    
    echo -e "${GREEN}[OK] Ollama instalado en /Applications.${NC}"
    echo -e "${YELLOW}[!] Ábrelo desde /Applications una vez y luego vuelve a ejecutar este script.${NC}"
    open /Applications
    exit 0
else
    echo -e "${GREEN}[OK] Ollama detectado.${NC}"
fi

# ── 2. CERRAR OLLAMA SI YA ESTÁ CORRIENDO ─────────────
echo -e "${YELLOW}[!] Reiniciando motor con permisos de interfaz...${NC}"
pkill -f "ollama" 2>/dev/null || true
sleep 1

# ── 3. CONFIGURAR PERMISOS CORS Y ARRANCAR ────────────
# Exportamos la variable para que Ollama acepte peticiones desde el navegador (file://)
export OLLAMA_ORIGINS="*"

# Guardamos también de forma permanente en el perfil del usuario
SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
fi

if [ -n "$SHELL_PROFILE" ]; then
    if ! grep -q "OLLAMA_ORIGINS" "$SHELL_PROFILE"; then
        echo 'export OLLAMA_ORIGINS="*"' >> "$SHELL_PROFILE"
        echo -e "${GREEN}[OK] OLLAMA_ORIGINS guardado en $SHELL_PROFILE${NC}"
    fi
fi

# Arrancar el servidor de Ollama en segundo plano
OLLAMA_ORIGINS="*" ollama serve &> /tmp/ollama_serve.log &
OLLAMA_PID=$!
echo -e "${GREEN}[OK] Servidor Ollama iniciado (PID: $OLLAMA_PID)${NC}"

# ── 4. ESPERAR A QUE EL MOTOR DESPIERTE ───────────────
echo -e "${YELLOW}[!] Esperando 5 segundos a que la IA despierte...${NC}"
sleep 5

# ── 5. ABRIR INTERFAZ EN EL NAVEGADOR ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX_FILE="$SCRIPT_DIR/index.html"

if [ -f "$INDEX_FILE" ]; then
    echo -e "${YELLOW}[!] Lanzando Fácil con AI Agent en el navegador...${NC}"
    open "$INDEX_FILE"
else
    echo -e "${RED}[ERROR] No se encontró index.html en: $SCRIPT_DIR${NC}"
    echo "Asegúrate de que este script esté en la misma carpeta que index.html"
    exit 1
fi

echo "======================================================"
echo -e "${GREEN}  ¡LISTO! Ya puedes usar tus modelos en el navegador.${NC}"
echo "  Mantén esta Terminal abierta (o minimizada)."
echo "  Para detener Ollama: cierra esta Terminal o ejecuta:"
echo "    pkill -f ollama"
echo "======================================================"

# Mantener el script vivo para que Ollama siga corriendo
wait $OLLAMA_PID
