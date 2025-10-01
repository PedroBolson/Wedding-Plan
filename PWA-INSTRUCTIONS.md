# 🎉 Wedding Plan PWA - Instruções para Ícones

## Opção 1: Automática (recomendada)

1. **Coloque seu PNG original na pasta:**
   ```
   public/icons/original/logo.png
   ```

2. **Execute o script:**
   ```bash
   ./generate-icons.sh
   ```

## Opção 2: Manual (online)

Se não quiser instalar ImageMagick, use um dos sites:
- https://realfavicongenerator.net/
- https://favicon.io/favicon-converter/
- https://app-icon-generator.com/

**Tamanhos necessários:**
- 72x72px → `public/icons/icon-72x72.png`
- 96x96px → `public/icons/icon-96x96.png`
- 128x128px → `public/icons/icon-128x128.png`
- 144x144px → `public/icons/icon-144x144.png`
- 152x152px → `public/icons/icon-152x152.png`
- 192x192px → `public/icons/icon-192x192.png`
- 384x384px → `public/icons/icon-384x384.png`
- 512x512px → `public/icons/icon-512x512.png`

**Arquivos extras:**
- `public/favicon.ico` (32x32px)
- `public/apple-touch-icon.png` (180x180px)

## 🚀 Após gerar os ícones:

1. **Build e deploy:**
   ```bash
   npm run build
   firebase deploy
   ```

2. **Teste o PWA:**
   - Abra o site no celular
   - No Chrome: "Adicionar à tela inicial"
   - No Safari: "Compartilhar" → "Adicionar à Tela de Início"

## 🎯 Recursos PWA incluídos:

✅ Manifest completo
✅ Service Worker (cache offline)
✅ Meta tags completas
✅ Atalhos rápidos
✅ Tema personalizado
✅ Suporte iOS/Android
✅ Instalável
✅ Funciona offline

## 📱 Seu app agora:

- Aparece como app nativo
- Funciona offline
- Tem splash screen personalizada
- Ícone na tela inicial
- Tema dourado elegante
- Atalhos para funcionalidades principais