#!/bin/bash
# Este archivo .command permite ejecutarse con doble clic desde el Finder de Mac.
# Es idéntico al .sh pero con esta extensión macOS lo reconoce como ejecutable gráfico.

# Cambiamos al directorio donde está este archivo (necesario para .command en Finder)
cd "$(dirname "$0")"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================================"
echo "          INICIANDO: FACIL CON AI AGENT"
echo "======================================================"

# ── 1. VERIFICAR OLLAMA ────────────────────────────────
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}[!] Ollama no detectado. Descargando...${NC}"
    curl -L https://ollama.com/download/Ollama-darwin.zip -o /tmp/Ollama-darwin.zip
    unzip -q /tmp/Ollama-darwin.zip -d /tmp/ollama_install
    mv /tmp/ollama_install/Ollama.app /Applications/ 2>/dev/null || true
    rm -rf /tmp/Ollama-darwin.zip /tmp/ollama_install
    echo -e "${GREEN}[OK] Ollama instalado.${NC}"
    echo -e "${YELLOW}[!] Ábrelo desde /Applications una vez y vuelve a ejecutar.${NC}"
    open /Applications
    exit 0
else
    echo -e "${GREEN}[OK] Ollama detectado.${NC}"
fi

# ── 2. CERRAR OLLAMA SI YA ESTÁ CORRIENDO ─────────────
pkill -f "ollama" 2>/dev/null || true
sleep 1

# ── 3. CONFIGURAR CORS Y ARRANCAR ─────────────────────
export OLLAMA_ORIGINS="*"

# Guardar permanentemente si no existe ya
SHELL_PROFILE="$HOME/.zshrc"
[ -f "$HOME/.bash_profile" ] && SHELL_PROFILE="$HOME/.bash_profile"

if ! grep -q "OLLAMA_ORIGINS" "$SHELL_PROFILE" 2>/dev/null; then
    echo 'export OLLAMA_ORIGINS="*"' >> "$SHELL_PROFILE"
fi

OLLAMA_ORIGINS="*" ollama serve &> /tmp/ollama_serve.log &
OLLAMA_PID=$!
echo -e "${GREEN}[OK] Servidor Ollama iniciado.${NC}"

# ── 4. ESPERAR ────────────────────────────────────────
echo -e "${YELLOW}[!] Esperando 5 segundos...${NC}"
sleep 5

# ── 5. ABRIR EN NAVEGADOR ─────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX_FILE="$SCRIPT_DIR/index.html"

if [ -f "$INDEX_FILE" ]; then
    open "$INDEX_FILE"
    echo -e "${GREEN}[!] Lanzando en el navegador...${NC}"
else
    echo -e "${RED}[ERROR] No se encontró index.html en: $SCRIPT_DIR${NC}"
    exit 1
fi

echo "======================================================"
echo -e "${GREEN}  ¡LISTO! Mantén esta ventana abierta (o minimizada).${NC}"
echo "======================================================"

wait $OLLAMA_PID
