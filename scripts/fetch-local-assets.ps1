# ============================================================
# Baixa a fonte Inter e as bandeiras do seletor de idioma para dentro de
# www/assets, e gera o www/assets/local.css que as declara.
#
# Rode só quando quiser atualizar a fonte ou incluir um idioma novo:
#   pwsh -File scripts/fetch-local-assets.ps1
#
# Por que empacotar em vez de usar CDN: num APK, buscar fonte e bandeiras da
# internet fazia a interface abrir quebrada com sinal ruim e mandava o IP do
# usuário para um terceiro (Fastly, que serve o jsDelivr) a cada abertura —
# o que sujava a resposta "não coleta dados" da ficha de Data Safety.
# ============================================================
$ErrorActionPreference = "Stop"

$root  = Join-Path $PSScriptRoot "..\www"
$fonts = Join-Path $root "assets\fonts"
$flags = Join-Path $root "assets\flags"
New-Item -ItemType Directory -Force -Path $fonts, $flags | Out-Null

# UA de navegador é obrigatório: com UA antigo o Google Fonts devolve TTF,
# que é várias vezes maior que o woff2.
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Latino cobre PT/EN/ES/FR/IT; cirílico cobre o russo. O chinês não existe na
# Inter e cai na fonte do sistema — incluir mais subsets só engordaria o APK.
$KEEP_SUBSETS = @('latin', 'cyrillic')
$FLAGS = @('br', 'us', 'es', 'fr', 'it', 'ru', 'cn')
$FLAG_ICONS_VERSION = '7.2.3'

$cssUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"
$css = (Invoke-WebRequest $cssUrl -Headers @{ "User-Agent" = $ua } -UseBasicParsing).Content

# O Google marca cada @font-face com um comentário contendo o nome do subset.
$blocks = [regex]::Matches($css, '/\*\s*([a-z\-]+)\s*\*/\s*@font-face\s*\{(.+?)\}', 'Singleline')

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("/* GERADO por scripts/fetch-local-assets.ps1 — não edite à mão. */")
[void]$sb.AppendLine()

foreach ($b in $blocks) {
    $subset = $b.Groups[1].Value
    if ($KEEP_SUBSETS -notcontains $subset) { continue }

    $body   = $b.Groups[2].Value
    $weight = [regex]::Match($body, 'font-weight:\s*(\d+)').Groups[1].Value
    $range  = [regex]::Match($body, 'unicode-range:\s*([^;]+);').Groups[1].Value.Trim()
    $url    = [regex]::Match($body, "url\((https://[^)]+\.woff2)\)").Groups[1].Value
    if (-not $url) { continue }

    $file = "inter-$subset-$weight.woff2"
    Invoke-WebRequest $url -OutFile (Join-Path $fonts $file) -Headers @{ "User-Agent" = $ua } -UseBasicParsing

    # unicode-range preservado do original: é o que faz o navegador baixar o
    # cirílico só quando a tela está em russo.
    [void]$sb.AppendLine("@font-face{")
    [void]$sb.AppendLine("  font-family:'Inter';font-style:normal;font-weight:$weight;font-display:swap;")
    [void]$sb.AppendLine("  src:url('./fonts/$file') format('woff2');")
    [void]$sb.AppendLine("  unicode-range:$range;")
    [void]$sb.AppendLine("}")
    Write-Host "fonte: $file"
}

[void]$sb.AppendLine()
[void]$sb.AppendLine("/* Bandeiras do seletor de idioma. Substitui a folha inteira do")
[void]$sb.AppendLine("   flag-icons (centenas de países) pelas $($FLAGS.Count) que o app usa. */")
[void]$sb.AppendLine(".fi{")
[void]$sb.AppendLine("  display:inline-block;width:1.33333em;height:1em;line-height:1em;")
[void]$sb.AppendLine("  background-size:contain;background-position:50%;background-repeat:no-repeat;")
[void]$sb.AppendLine("  vertical-align:middle;")
[void]$sb.AppendLine("}")

foreach ($f in $FLAGS) {
    $url = "https://cdn.jsdelivr.net/gh/lipis/flag-icons@$FLAG_ICONS_VERSION/flags/4x3/$f.svg"
    Invoke-WebRequest $url -OutFile (Join-Path $flags "$f.svg") -UseBasicParsing
    [void]$sb.AppendLine(".fi-$f{background-image:url('./flags/$f.svg');}")
    Write-Host "bandeira: $f.svg"
}

Set-Content -Path (Join-Path $root "assets\local.css") -Value $sb.ToString() -Encoding UTF8
Write-Host "`ngerado www/assets/local.css"
