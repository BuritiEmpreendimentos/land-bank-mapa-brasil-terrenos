#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║           GERADOR DE data.js — Land Bank Grupo Brasil            ║
║  Lê a planilha Excel + arquivos KML e gera o data.js do site.    ║
╚══════════════════════════════════════════════════════════════════╝

USO:
    python gerar_data.py

DEPENDÊNCIAS:
    pip install openpyxl lxml

CONFIGURAÇÃO (edite a seção abaixo):
"""

# ─────────────────────────────────────────────
#   ⚙️  CONFIGURAÇÃO — EDITE AQUI
# ─────────────────────────────────────────────

# Caminho da planilha Excel
EXCEL_PATH = "AREAS_LAND_BANK.xlsx"

# Nome da aba/sheet da planilha (None = primeira aba)
EXCEL_SHEET = None

# Pasta onde estão os arquivos .kml (busca recursiva em subpastas)
KML_FOLDER = "kml"

# Arquivo de saída
OUTPUT_PATH = "data.js"

# Coluna da planilha usada para VINCULAR ao arquivo KML
# O script vai comparar o valor desta coluna com o NOME do arquivo KML (sem extensão)
# Exemplos de valores comuns: "nome", "arquivo", "codigo", "kml"
COLUNA_CHAVE = "nome"

# Mapeamento das colunas da planilha para os campos do sistema
# Formato: "campo_no_sistema": "nome_da_coluna_no_excel"
# Se uma coluna não existir na sua planilha, deixe o valor como None
COLUNAS = {
    "nome":                "nome",
    "codigo":              "codigo",
    "regional":            "regional",
    "cidade":              "cidade",
    "empreendimento":      "empreendimento",
    "tipo":                "tipo",
    "year":                "year",
    "on_off":              "on_off",
    "area_total":          "area_total",
    "total_unidades":      "total_unidades",
    "vgv_total":           "vgv_total",
    "vgv_bt":              "vgv_bt",
    "custo_terreno":       "custo_terreno",
    "custo_construcao":    "custo_construcao",
    "participacao_buriti": "participacao_buriti",
    "data_lancamento":     "data_lancamento",
}

# Cores por regional (adicione/edite conforme necessário)
CORES = {
    "NORTE":          "#c0392b",
    "NORDESTE I":     "#d35400",
    "NORDESTE II":    "#e67e22",
    "CENTRO OESTE":   "#27ae60",
    "CENTRO OESTE II":"#16a085",
    "SUDESTE":        "#2980b9",
    "SUL":            "#8e44ad",
    "TOCANTINS":      "#0e6655",
    "OESTE":          "#c2185b",
    "None":           "#7f8c8d",
}

# ─────────────────────────────────────────────
#   🔧  CÓDIGO — NÃO É NECESSÁRIO EDITAR
# ─────────────────────────────────────────────

import os
import re
import json
import math
import unicodedata
from pathlib import Path
from datetime import datetime, date

def normalizar(texto):
    """Remove acentos, espaços extras e deixa em maiúsculas para comparação."""
    if not texto:
        return ""
    texto = str(texto).strip().upper()
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    # Remove extensão .kml se houver
    texto = re.sub(r'\.KML$', '', texto)
    # Normaliza separadores de caminho — pega só o nome do arquivo
    texto = Path(texto).name
    return texto

def ler_excel(path, sheet=None):
    """Lê o Excel e retorna lista de dicionários, um por linha."""
    try:
        import openpyxl
    except ImportError:
        raise ImportError("Execute: pip install openpyxl")

    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet] if sheet else wb.active
    
    linhas = list(ws.iter_rows(values_only=True))
    if not linhas:
        return []
    
    cabecalho = [str(c).strip() if c is not None else "" for c in linhas[0]]
    registros = []
    
    for linha in linhas[1:]:
        if all(v is None for v in linha):
            continue  # pula linhas completamente vazias
        registro = {}
        for i, col in enumerate(cabecalho):
            registro[col] = linha[i] if i < len(linha) else None
        registros.append(registro)
    
    print(f"  ✅ Excel: {len(registros)} linhas lidas — colunas: {cabecalho}")
    return registros, cabecalho

def extrair_coordenadas_kml(caminho_kml):
    """Extrai lista de polígonos [[lat,lng], ...] de um arquivo KML."""
    try:
        from lxml import etree
    except ImportError:
        raise ImportError("Execute: pip install lxml")

    try:
        tree = etree.parse(caminho_kml)
    except Exception as e:
        print(f"  ⚠️  Erro ao parsear {caminho_kml}: {e}")
        return [], None

    # Namespace KML
    ns = {"kml": "http://www.opengis.net/kml/2.2"}
    root = tree.getroot()

    # Remove namespace para facilitar busca
    for elem in root.iter():
        if elem.tag.startswith("{"):
            elem.tag = elem.tag.split("}", 1)[1]

    poligonos = []
    todos_lats = []
    todos_lngs = []

    # Busca todas as tags <coordinates> dentro de <Polygon>
    for polygon in root.iter("Polygon"):
        for coords_tag in polygon.iter("coordinates"):
            texto = coords_tag.text
            if not texto:
                continue
            
            pontos = []
            for token in texto.strip().split():
                partes = token.split(",")
                if len(partes) >= 2:
                    try:
                        lng = float(partes[0])
                        lat = float(partes[1])
                        pontos.append([lat, lng])
                        todos_lats.append(lat)
                        todos_lngs.append(lng)
                    except ValueError:
                        pass
            
            if pontos:
                poligonos.append(pontos)

    # Fallback: busca LineString também
    if not poligonos:
        for ls in root.iter("LineString"):
            for coords_tag in ls.iter("coordinates"):
                texto = coords_tag.text
                if not texto:
                    continue
                pontos = []
                for token in texto.strip().split():
                    partes = token.split(",")
                    if len(partes) >= 2:
                        try:
                            lng = float(partes[0])
                            lat = float(partes[1])
                            pontos.append([lat, lng])
                            todos_lats.append(lat)
                            todos_lngs.append(lng)
                        except ValueError:
                            pass
                if pontos:
                    poligonos.append(pontos)

    # Calcula centroide
    centroide = None
    if todos_lats and todos_lngs:
        centroide = [sum(todos_lats) / len(todos_lats), sum(todos_lngs) / len(todos_lngs)]

    return poligonos, centroide

def calcular_area(poligonos):
    """Estima área total em m² usando fórmula de Shoelace (aproximação plana)."""
    total = 0.0
    for pol in poligonos:
        if len(pol) < 3:
            continue
        # Converte para metros (aproximação: 1° lat ≈ 111320m, 1° lng ≈ 111320 * cos(lat))
        lat_ref = pol[0][0]
        escala_lat = 111320.0
        escala_lng = 111320.0 * math.cos(math.radians(lat_ref))
        
        coords_m = [(p[1] * escala_lng, p[0] * escala_lat) for p in pol]
        
        n = len(coords_m)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += coords_m[i][0] * coords_m[j][1]
            area -= coords_m[j][0] * coords_m[i][1]
        total += abs(area) / 2.0
    return total

def serializar_valor(v):
    """Converte tipos Python para tipos serializáveis em JSON."""
    if isinstance(v, (datetime, date)):
        return str(v)
    if isinstance(v, float) and math.isnan(v):
        return None
    return v

def main():
    print("\n" + "═" * 60)
    print("  🗺️  GERADOR data.js — Land Bank Grupo Brasil")
    print("═" * 60)

    # ── 1. Ler Excel ──────────────────────────────────────────────
    print(f"\n📊 Lendo planilha: {EXCEL_PATH}")
    if not os.path.exists(EXCEL_PATH):
        print(f"  ❌ Arquivo não encontrado: {EXCEL_PATH}")
        print(f"     Verifique o caminho em EXCEL_PATH no início do script.")
        return

    resultado = ler_excel(EXCEL_PATH, EXCEL_SHEET)
    registros_excel, cabecalho_excel = resultado

    # Monta índice: chave_normalizada → registro
    indice_excel = {}
    coluna_chave_real = None

    # Descobre o nome real da coluna chave no Excel (case-insensitive)
    for col in cabecalho_excel:
        if col.strip().lower() == COLUNA_CHAVE.strip().lower():
            coluna_chave_real = col
            break

    if not coluna_chave_real:
        print(f"\n  ⚠️  Coluna '{COLUNA_CHAVE}' não encontrada no Excel.")
        print(f"     Colunas disponíveis: {cabecalho_excel}")
        print(f"     Ajuste COLUNA_CHAVE no início do script.")
        print(f"     Continuando sem vincular dados da planilha...\n")
    else:
        for reg in registros_excel:
            chave = normalizar(reg.get(coluna_chave_real, ""))
            if chave:
                indice_excel[chave] = reg

    # ── 2. Ler KMLs ───────────────────────────────────────────────
    print(f"\n📁 Buscando KMLs em: {KML_FOLDER}")
    if not os.path.exists(KML_FOLDER):
        print(f"  ❌ Pasta não encontrada: {KML_FOLDER}")
        print(f"     Verifique o caminho em KML_FOLDER no início do script.")
        return

    arquivos_kml = list(Path(KML_FOLDER).rglob("*.kml")) + list(Path(KML_FOLDER).rglob("*.KML"))
    arquivos_kml = sorted(set(arquivos_kml))
    print(f"  ✅ {len(arquivos_kml)} arquivos KML encontrados")

    # ── 3. Montar items ────────────────────────────────────────────
    print(f"\n🔗 Vinculando KMLs com a planilha...")
    items = []
    vinculados = 0
    sem_poligono = 0

    for kml_path in arquivos_kml:
        nome_kml = kml_path.stem  # nome sem extensão
        chave_kml = normalizar(nome_kml)

        # Extrai geometria
        poligonos, centroide = extrair_coordenadas_kml(str(kml_path))
        if not poligonos:
            sem_poligono += 1

        # Tenta vincular com Excel
        dados_excel = None
        if indice_excel:
            # Correspondência exata
            if chave_kml in indice_excel:
                dados_excel = indice_excel[chave_kml]
            else:
                # Correspondência parcial: KML contém chave ou vice-versa
                for chave_excel, reg in indice_excel.items():
                    if chave_kml in chave_excel or chave_excel in chave_kml:
                        dados_excel = reg
                        break

        # Monta objeto do empreendimento
        e = None
        if dados_excel:
            vinculados += 1
            e = {}
            for campo_sistema, col_excel in COLUNAS.items():
                if col_excel is None:
                    e[campo_sistema] = None
                    continue
                # Busca a coluna no registro (case-insensitive)
                valor = None
                for k, v in dados_excel.items():
                    if k.strip().lower() == col_excel.strip().lower():
                        valor = serializar_valor(v)
                        break
                e[campo_sistema] = valor

        item = {
            "n": nome_kml,
            "p": poligonos,
            "c": centroide,
            "e": e,
        }
        items.append(item)

    # ── 4. Montar itens sem KML (da planilha) ─────────────────────
    # Empreendimentos que estão na planilha mas não têm KML ainda
    chaves_kml_usadas = set()
    for item in items:
        if item["e"]:
            chave = normalizar(item["e"].get(COLUNA_CHAVE, "") or "")
            chaves_kml_usadas.add(chave)

    sem_kml = 0
    for reg in registros_excel:
        chave = normalizar(reg.get(coluna_chave_real, "") if coluna_chave_real else "")
        if chave and chave not in chaves_kml_usadas:
            e = {}
            for campo_sistema, col_excel in COLUNAS.items():
                if col_excel is None:
                    e[campo_sistema] = None
                    continue
                valor = None
                for k, v in reg.items():
                    if k.strip().lower() == col_excel.strip().lower():
                        valor = serializar_valor(v)
                        break
                e[campo_sistema] = valor

            items.append({
                "n": reg.get(coluna_chave_real, "sem nome") if coluna_chave_real else "sem nome",
                "p": [],
                "c": None,
                "e": e,
            })
            sem_kml += 1

    # ── 5. Calcular estatísticas ───────────────────────────────────
    total_area = 0.0
    total_unidades = 0.0
    total_vgv = 0.0
    total_vgv_bt = 0.0
    on_count = 0
    on_map = sum(1 for i in items if i["p"])
    matched = sum(1 for i in items if i["e"])
    regional_summary = {}

    for item in items:
        e = item["e"]
        if not e:
            continue

        regional = str(e.get("regional") or "None")
        if regional not in regional_summary:
            regional_summary[regional] = {"count": 0, "units": 0, "vgv": 0, "area": 0}

        regional_summary[regional]["count"] += 1

        try:
            area = float(e.get("area_total") or 0)
            total_area += area
            regional_summary[regional]["area"] += area
        except (TypeError, ValueError):
            pass

        try:
            unidades = float(e.get("total_unidades") or 0)
            total_unidades += unidades
            regional_summary[regional]["units"] += unidades
        except (TypeError, ValueError):
            pass

        try:
            vgv = float(e.get("vgv_total") or 0)
            total_vgv += vgv
            regional_summary[regional]["vgv"] += vgv
        except (TypeError, ValueError):
            pass

        try:
            vgv_bt = float(e.get("vgv_bt") or 0)
            total_vgv_bt += vgv_bt
        except (TypeError, ValueError):
            pass

        try:
            if int(e.get("on_off") or 0) == 1:
                on_count += 1
        except (TypeError, ValueError):
            pass

    stats = {
        "total":       len(items),
        "on_map":      on_map,
        "matched":     matched,
        "total_area":  total_area,
        "total_units": total_unidades,
        "total_vgv":   total_vgv,
        "total_vgv_bt": total_vgv_bt,
        "on_count":    on_count,
    }

    # ── 6. Montar DATA e escrever data.js ─────────────────────────
    data = {
        "items":            items,
        "colors":           CORES,
        "stats":            stats,
        "regional_summary": regional_summary,
    }

    js_content = "const DATA = " + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ";"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    # ── 7. Relatório final ────────────────────────────────────────
    print(f"\n{'═' * 60}")
    print(f"  ✅ data.js gerado com sucesso!")
    print(f"{'═' * 60}")
    print(f"  📦 Total de itens:          {len(items)}")
    print(f"  🗺️  Com polígono KML:         {on_map}")
    print(f"  🔗 Vinculados à planilha:   {vinculados}")
    print(f"  📋 Só na planilha (sem KML):{sem_kml}")
    print(f"  ⚠️  KML sem coordenadas:     {sem_poligono}")
    print(f"  💰 VGV Total:               R$ {total_vgv:,.1f} mi")
    print(f"  🏘️  Total de unidades:        {total_unidades:,.0f}")
    print(f"\n  📄 Arquivo gerado: {os.path.abspath(OUTPUT_PATH)}")
    print(f"{'═' * 60}\n")
    print("  👉 Próximo passo: faça commit e push do data.js para")
    print("     o seu repositório. O site atualizará automaticamente.")
    print(f"{'═' * 60}\n")

if __name__ == "__main__":
    main()