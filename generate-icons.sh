#!/bin/bash

# Script para gerar todos os ícones PWA a partir do logo original
# Coloque seu PNG original na pasta public/icons/original/ com nome "logo.png"

ORIGINAL="public/icons/original/logo.png"
OUTPUT_DIR="public/icons"

# Tamanhos necessários para PWA
SIZES=(72 96 128 144 152 192 384 512)

echo "🎉 Gerando ícones PWA para Wedding Plan..."

# Verificar se ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick não encontrado. Instalando..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install imagemagick
    else
        # Linux
        sudo apt-get install imagemagick
    fi
fi

# Verificar se o arquivo original existe
if [ ! -f "$ORIGINAL" ]; then
    echo "❌ Arquivo original não encontrado: $ORIGINAL"
    echo "📋 Por favor, coloque seu logo PNG na pasta public/icons/original/ com o nome 'logo.png'"
    exit 1
fi

echo "✅ Logo original encontrado: $ORIGINAL"

# Gerar cada tamanho
for size in "${SIZES[@]}"; do
    output_file="$OUTPUT_DIR/icon-${size}x${size}.png"
    echo "🔄 Gerando: icon-${size}x${size}.png"
    
    convert "$ORIGINAL" \
        -background none \
        -resize "${size}x${size}" \
        -extent "${size}x${size}" \
        -gravity center \
        "$output_file"
    
    if [ $? -eq 0 ]; then
        echo "✅ Criado: $output_file"
    else
        echo "❌ Erro ao criar: $output_file"
    fi
done

# Criar favicon.ico
echo "🔄 Gerando favicon.ico..."
convert "$ORIGINAL" \
    -background none \
    -resize 32x32 \
    -extent 32x32 \
    -gravity center \
    "public/favicon.ico"

# Criar apple-touch-icon
echo "🔄 Gerando apple-touch-icon..."
convert "$ORIGINAL" \
    -background none \
    -resize 180x180 \
    -extent 180x180 \
    -gravity center \
    "public/apple-touch-icon.png"

echo "🎉 Todos os ícones foram gerados com sucesso!"
echo "📱 Seu PWA está pronto com o logo personalizado do casamento!"