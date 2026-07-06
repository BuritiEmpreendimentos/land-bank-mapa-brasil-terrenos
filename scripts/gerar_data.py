#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          GERADOR DE data.json — Land Bank Grupo Brasil           ║
║  Lê a planilha Excel + arquivos KML e gera o data.json do site.  ║
╚══════════════════════════════════════════════════════════════════╝
"""

# ─────────────────────────────────────────────
#   ⚙️  CONFIGURAÇÃO — EDITE AQUI
# ─────────────────────────────────────────────

EXCEL_PATH  = "../data/areas_land_bank_com_id.xlsx"
EXCEL_SHEET = "AREAS"
KML_FOLDER  = "../data/kml"
OUTPUT_PATH = "../src/data.json"
COLUNA_ID   = "ID"
ID_REGEX    = r'^(MAP\d+)'

COLUNA_SITUACAO   = "Situação do Empreendimento"
SITUACAO_INCLUIDA = "A LANÇAR"

COLUNAS = {
    "nome":                "Nome",
    "codigo":              "Código Modelo",
    "regional":            "Regional",
    "cidade":              "Cidade",
    "uf":                  "UF",
    "empreendimento":      "Empreendimento",
    "tipo":                "Tipo",
    "year":                "Year",
    "on_off":              "[ON / OFF]",
    "area_total":          "Area Total m2",
    "total_unidades":      "Total de Unidades",
    "vgv_total":           "VGV Total\n(R$mm)",
    "vgv_bt":              "VGV Total\n(R$mm) BT",
    "custo_terreno":       "Custo Total do Terreno\n(Pré Rateio - R$mm)",
    "custo_construcao":    "Custo de Construção\n(Pré Rateio - R$mm)",
    "participacao_buriti": "Participação Buriti",
    "data_lancamento":     "Data de Lançamento",
}

CORES = {
    "NORTE":           "#c0392b",
    "NORDESTE I":      "#d35400",
    "NORDESTE II":     "#e67e22",
    "CENTRO OESTE":    "#27ae60",
    "CENTRO OESTE II": "#16a085",
    "SUDESTE":         "#2980b9",
    "SUL":             "#8e44ad",
    "TOCANTINS":       "#0e6655",
    "OESTE":           "#c2185b",
    "None":            "#7f8c8d",
}

import os, re, json, math, unicodedata
from pathlib import Path
from datetime import datetime, date


def normalizar(texto):
    if not texto:
        return ""
    texto = str(texto).strip().upper()
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = re.sub(r'\.KML$', '', texto)
    texto = Path(texto).name
    return texto


def filtrar_por_situacao(registros, cabecalho, col_id=COLUNA_ID,
                          col_situacao=COLUNA_SITUACAO, situacao_incluida=SITUACAO_INCLUIDA):
    """Mantém apenas os registros cuja 'Situação do Empreendimento' seja a incluída (ex.: 'A lançar').

    Retorna também o conjunto de IDs descartados, para diferenciar no relatório
    um KML "sem vínculo real" de um KML cujo registro existe mas foi filtrado por situação.
    """
    col_real    = next((c for c in cabecalho if c.strip().lower() == col_situacao.strip().lower()), None)
    col_id_real = next((c for c in cabecalho if c.strip().lower() == col_id.strip().lower()), None)
    if not col_real:
        print(f"  ℹ️  Coluna '{col_situacao}' não encontrada — nenhum filtro de situação aplicado.")
        return registros, 0, {}

    incluidos, descartados, contagem_descartados_por_id = [], 0, {}
    for reg in registros:
        valor = str(reg.get(col_real, "") or "").strip().upper()
        if valor == situacao_incluida:
            incluidos.append(reg)
        else:
            descartados += 1
            if col_id_real:
                id_val = str(reg.get(col_id_real, "") or "").strip().upper()
                if id_val:
                    contagem_descartados_por_id[id_val] = contagem_descartados_por_id.get(id_val, 0) + 1

    print(f"  🚦 Filtro de situação ('{situacao_incluida}'): {len(incluidos)} mantidos, {descartados} descartados")
    return incluidos, descartados, contagem_descartados_por_id


def extrair_id(texto, regex=ID_REGEX):
    if not texto:
        return None
    m = re.match(regex, str(texto).strip(), re.IGNORECASE)
    return m.group(1).upper() if m else None


def ler_excel(path, sheet=None):
    try:
        import openpyxl
    except ImportError:
        raise ImportError("Execute: pip install openpyxl")
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet] if sheet else wb.active
    linhas = list(ws.iter_rows(values_only=True))
    if not linhas:
        return [], []

    # Detecta automaticamente a linha de cabeçalho: primeira linha onde a
    # primeira célula não-nula começa com 'ID' (case-insensitive).
    header_idx = 0
    for i, row in enumerate(linhas):
        first = next((str(v).strip() for v in row if v is not None), "")
        if first.upper() == "ID":
            header_idx = i
            break

    cabecalho = [str(c).strip() if c is not None else "" for c in linhas[header_idx]]
    registros = []
    for linha in linhas[header_idx + 1:]:
        if all(v is None for v in linha):
            continue
        registro = {}
        for i, col in enumerate(cabecalho):
            registro[col] = linha[i] if i < len(linha) else None
        registros.append(registro)
    print(f"  ✅ Excel: {len(registros)} linhas lidas — colunas: {cabecalho}")
    return registros, cabecalho


def extrair_coordenadas_kml(caminho_kml):
    try:
        from lxml import etree
    except ImportError:
        raise ImportError("Execute: pip install lxml")
    try:
        tree = etree.parse(caminho_kml)
    except Exception as e:
        print(f"  ⚠️  Erro ao parsear {caminho_kml}: {e}")
        return None, [], None
    root = tree.getroot()
    for elem in root.iter():
        if elem.tag.startswith("{"):
            elem.tag = elem.tag.split("}", 1)[1]
    nome_kml = None
    doc = root.find(".//Document")
    if doc is not None:
        tag = doc.find("name")
        if tag is not None and tag.text and tag.text.strip():
            nome_kml = tag.text.strip()
    if not nome_kml:
        pm = root.find(".//Placemark")
        if pm is not None:
            tag = pm.find("name")
            if tag is not None and tag.text and tag.text.strip():
                nome_kml = tag.text.strip()
    if not nome_kml:
        tag = root.find(".//name")
        if tag is not None and tag.text and tag.text.strip():
            nome_kml = tag.text.strip()
    poligonos  = []
    todos_lats = []
    todos_lngs = []
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
    centroide = None
    if todos_lats and todos_lngs:
        centroide = [sum(todos_lats)/len(todos_lats), sum(todos_lngs)/len(todos_lngs)]
    return nome_kml, poligonos, centroide


def serializar_valor(v):
    if isinstance(v, (datetime, date)):
        return str(v)
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def construir_e(reg):
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
    return e


def _agrupar_kmls(arquivos_kml):
    """Lê cada KML e agrupa polígonos por ID (MAP###)."""
    kml_por_id      = {}
    kml_sem_poligono = 0
    kml_sem_id       = 0

    for kml_path in arquivos_kml:
        nome_arquivo                        = kml_path.stem
        nome_kml_tag, poligonos, _centroide = extrair_coordenadas_kml(str(kml_path))

        if not poligonos:
            kml_sem_poligono += 1

        nome_display = nome_kml_tag or nome_arquivo

        id_kml = extrair_id(nome_arquivo)
        if not id_kml and nome_kml_tag:
            id_kml = extrair_id(nome_kml_tag)
        if not id_kml:
            kml_sem_id += 1

        if id_kml not in kml_por_id:
            kml_por_id[id_kml] = {'nome': nome_display, 'poligonos': []}

        kml_por_id[id_kml]['poligonos'].extend(poligonos)

    return kml_por_id, kml_sem_poligono, kml_sem_id


def _criar_items(kml_por_id, indice_excel, col_id_real, ids_excluidos_situacao=frozenset()):
    """Cria a lista de items vinculando KMLs com registros da planilha.

    KMLs cujo único vínculo na planilha foi descartado pelo filtro de situação
    (todas as linhas 'Lançado') não geram item — não devem aparecer no site.
    """
    items               = []
    kml_vinculados      = 0
    kml_sem_vinculo     = 0
    nao_vinculados      = []
    ids_kml_processados = set()

    # ── Passo 1: 1 item por linha do Excel, polígonos agrupados por ID ──
    # Múltiplos KMLs com mesmo MAP### são fundidos; o VGV/unidades de
    # cada linha Excel é contado apenas 1×.
    for id_kml, kml_info in kml_por_id.items():
        poligonos    = kml_info['poligonos']
        nome_display = kml_info['nome']

        todos_lats = [pt[0] for poly in poligonos for pt in poly]
        todos_lngs = [pt[1] for poly in poligonos for pt in poly]
        centroide  = (
            [sum(todos_lats) / len(todos_lats), sum(todos_lngs) / len(todos_lngs)]
            if todos_lats else None
        )

        registros_vinculados = indice_excel.get(id_kml, []) if id_kml else []

        if registros_vinculados:
            kml_vinculados += 1
            ids_kml_processados.add(id_kml)
            for reg in registros_vinculados:
                items.append({
                    "id": id_kml,
                    "n":  nome_display,
                    "p":  poligonos,
                    "c":  centroide,
                    "e":  construir_e(reg),
                })
        else:
            kml_sem_vinculo += 1
            nao_vinculados.append((nome_display, id_kml or "sem ID", f"ID={id_kml}"))
            if id_kml not in ids_excluidos_situacao:
                items.append({
                    "id": id_kml,
                    "n":  nome_display,
                    "p":  poligonos,
                    "c":  centroide,
                    "e":  None,
                })

    # ── Passo 2: registros do Excel sem nenhum KML correspondente ──
    sem_kml = 0
    if col_id_real:
        for id_val, regs in indice_excel.items():
            if id_val not in ids_kml_processados:
                for reg in regs:
                    items.append({
                        "id": id_val,
                        "n":  reg.get(col_id_real, id_val),
                        "p":  [],
                        "c":  None,
                        "e":  construir_e(reg),
                    })
                    sem_kml += 1

    return items, kml_vinculados, kml_sem_vinculo, nao_vinculados, sem_kml


def _calcular_stats(items, registros_excel):
    """Calcula estatísticas globais e resumo por regional."""
    on_map = sum(1 for i in items if i["p"])

    def soma_excel(col):
        total = 0.0
        for reg in registros_excel:
            for k, v in reg.items():
                if k.strip().lower() == col.strip().lower():
                    if isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)):
                        total += v
                    break
        return total

    col_area   = COLUNAS.get("area_total")
    col_vgv    = COLUNAS.get("vgv_total")
    col_vgv_bt = COLUNAS.get("vgv_bt")
    col_units  = COLUNAS.get("total_unidades")
    col_on_off = COLUNAS.get("on_off")

    total_area     = soma_excel(col_area)   if col_area   else 0.0
    total_vgv      = soma_excel(col_vgv)    if col_vgv    else 0.0
    total_vgv_bt   = soma_excel(col_vgv_bt) if col_vgv_bt else 0.0
    total_unidades = soma_excel(col_units)  if col_units  else 0.0

    total_ativo   = sum(1 for r in registros_excel
                        for k, v in r.items()
                        if k.strip().lower() == (col_on_off or "").strip().lower() and v == 1)
    total_inativo = len(registros_excel) - total_ativo

    stats = {
        "total":          len(items),
        "total_planilha": len(registros_excel),
        "total_ativo":    total_ativo,
        "total_inativo":  total_inativo,
        "total_units":    round(total_unidades, 0),
        "total_area":     round(total_area, 2),
        "total_vgv":      round(total_vgv, 2),
        "total_vgv_bt":   round(total_vgv_bt, 2),
    }

    regional_summary = {}
    for item in items:
        if item["e"] and item["e"].get("regional"):
            r = item["e"]["regional"]
            if r not in regional_summary:
                regional_summary[r] = {"count": 0, "units": 0, "vgv": 0}
            regional_summary[r]["count"] += 1
            regional_summary[r]["units"] += item["e"].get("total_unidades") or 0
            regional_summary[r]["vgv"]   += item["e"].get("vgv_total") or 0

    return stats, regional_summary, on_map, total_vgv, total_unidades


def _escrever_saida(data, output_path):
    """Serializa o objeto data para o arquivo data.json."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))


LARGURA = 60


def _titulo(texto):
    print(f"\n{'─'*LARGURA}")
    print(f"  {texto}")
    print(f"{'─'*LARGURA}")


def _linha(rotulo, valor, marcador="  "):
    """Imprime 'rotulo ..... valor' alinhado à largura fixa do relatório."""
    pontos = "." * max(2, LARGURA - len(marcador) - len(rotulo) - len(str(valor)) - 3)
    print(f"{marcador}{rotulo} {pontos} {valor}")


def main():
    print("\n" + "═"*LARGURA)
    print("  🗺️  GERADOR data.json — Land Bank Grupo Brasil")
    print("═"*LARGURA)

    # ── Leitura do Excel ─────────────────────────────────────────
    _titulo(f"📊 PLANILHA — {EXCEL_PATH}")
    if not os.path.exists(EXCEL_PATH):
        print(f"  ❌ Arquivo não encontrado: {EXCEL_PATH}")
        return

    registros_excel, cabecalho_excel = ler_excel(EXCEL_PATH, EXCEL_SHEET)
    registros_excel, situacao_descartados, descartados_por_id = filtrar_por_situacao(registros_excel, cabecalho_excel)

    indice_excel = {}
    col_id_real  = None

    for col in cabecalho_excel:
        if col.strip().lower() == COLUNA_ID.strip().lower():
            col_id_real = col
            break

    if not col_id_real:
        print(f"  ⚠️  Coluna de ID '{COLUNA_ID}' não encontrada no Excel.")
        print(f"     Colunas disponíveis: {cabecalho_excel}")
        print(f"     Continuando sem vincular dados da planilha...")
    else:
        for reg in registros_excel:
            id_val = str(reg.get(col_id_real, "") or "").strip().upper()
            if id_val:
                indice_excel.setdefault(id_val, []).append(reg)

        ids_duplicados = {k: v for k, v in indice_excel.items() if len(v) > 1}
        print(f"  ✅ {len(indice_excel)} IDs únicos no índice")

        if ids_duplicados:
            print(f"  ℹ️  {len(ids_duplicados)} ID(s) com múltiplos registros (correto — um KML, várias linhas):")
            for id_k in sorted(set(ids_duplicados.keys())):
                print(f"     • {id_k}: {len(ids_duplicados[id_k])} registros")

    # IDs com linhas em ambas as situações: pelo menos uma "A lançar" (segue no
    # processamento) e pelo menos uma "Lançado" (descartada) — caso do MAP030.
    ids_situacao_mista = sorted(set(indice_excel.keys()) & descartados_por_id.keys())

    # ── Leitura e agrupamento dos KMLs ───────────────────────────
    _titulo(f"📁 ARQUIVOS KML — {KML_FOLDER}")
    if not os.path.exists(KML_FOLDER):
        print(f"  ❌ Pasta não encontrada: {KML_FOLDER}")
        return

    arquivos_kml = list(Path(KML_FOLDER).rglob("*.kml")) + list(Path(KML_FOLDER).rglob("*.KML"))
    arquivos_kml = sorted(set(arquivos_kml))
    print(f"  ✅ {len(arquivos_kml)} arquivos KML encontrados")

    print(f"\n  🔗 Vinculando KMLs com a planilha...")
    print(f"     Chave: prefixo '{ID_REGEX}' do nome do arquivo KML → coluna '{COLUNA_ID}' do Excel")

    kml_por_id, kml_sem_poligono, kml_sem_id = _agrupar_kmls(arquivos_kml)

    # ── Criação dos items ─────────────────────────────────────────
    items, kml_vinculados, kml_sem_vinculo, nao_vinculados, sem_kml = \
        _criar_items(kml_por_id, indice_excel, col_id_real, set(descartados_por_id.keys()))

    sem_localizacao = []
    for item in items:
        if not item["p"] and not item["c"]:
            e = item["e"] or {}
            sem_localizacao.append({
                "id":       item.get("id") or "—",
                "nome":     e.get("nome") or item["n"] or "—",
                "cidade":   e.get("cidade") or "—",
                "regional": e.get("regional") or "—",
                "motivo":   "sem KML" if item["e"] else "KML sem geometria",
            })

    sem_vinculo_real    = [n for n in nao_vinculados if n[1] not in descartados_por_id]
    excluidos_situacao  = [n for n in nao_vinculados if n[1] in descartados_por_id]

    # ── Estatísticas ──────────────────────────────────────────────
    stats, regional_summary, on_map, total_vgv, total_unidades = \
        _calcular_stats(items, registros_excel)

    # ── Timestamp e geração do arquivo ───────────────────────────
    meses = ['janeiro','fevereiro','março','abril','maio','junho',
             'julho','agosto','setembro','outubro','novembro','dezembro']
    now = datetime.now()
    last_updated = f"Dados atualizados em {now.day} de {meses[now.month - 1]} de {now.year}"

    data = {
        "items":            items,
        "colors":           CORES,
        "stats":            stats,
        "regional_summary": regional_summary,
        "last_updated":     last_updated,
    }

    _escrever_saida(data, OUTPUT_PATH)

    # ── Relatório ─────────────────────────────────────────────────
    print("\n" + "═"*LARGURA)
    print("  ✅ data.json GERADO COM SUCESSO")
    print("═"*LARGURA)

    print("\n  Planilha")
    _linha("Situação 'A lançar' considerados",        stats['total_planilha'])
    _linha("Situação 'Lançado' descartados (linhas)",  situacao_descartados)
    _linha("KMLs afetados (todas as linhas 'Lançado')", len(excluidos_situacao))
    _linha("IDs com situação mista (parcial)",          len(ids_situacao_mista))

    print("\n  Vinculação KML ↔ Planilha")
    _linha("IDs KML vinculados",                 kml_vinculados)
    _linha("IDs KML sem vínculo",                kml_sem_vinculo)
    _linha("Registros só na planilha (sem KML)", sem_kml)
    _linha("Arquivos KML sem geometria",         kml_sem_poligono)
    _linha("Arquivos KML sem ID reconhecível",   kml_sem_id)

    print("\n  Resultado")
    _linha("Total de itens gerados",             len(items))
    _linha("Com polígono no mapa",                on_map)
    _linha("Sem localização",                     len(sem_localizacao))
    _linha("Total de unidades",                   f"{total_unidades:,.0f}")
    _linha("VGV Total",                           f"R$ {total_vgv:,.1f} mi")

    print(f"\n  📄 Arquivo gerado: {os.path.abspath(OUTPUT_PATH)}")

    if ids_situacao_mista:
        _titulo(f"🔀 IDs COM SITUAÇÃO MISTA — 'A lançar' + 'Lançado' ({len(ids_situacao_mista)})")
        print("  (mantidos no processamento, mas com linha(s) descartada(s) do mesmo ID)")
        for id_k in ids_situacao_mista:
            mantidas    = len(indice_excel[id_k])
            descartadas = descartados_por_id[id_k]
            print(f"  • {id_k}: {mantidas} linha(s) 'A lançar' mantida(s), {descartadas} linha(s) 'Lançado' descartada(s)")

    if sem_localizacao:
        _titulo(f"📍 SEM LOCALIZAÇÃO ({len(sem_localizacao)} registro(s))")
        col_id_w     = max(len(r["id"])       for r in sem_localizacao)
        col_nome_w   = max(len(r["nome"])     for r in sem_localizacao)
        col_cidade_w = max(len(r["cidade"])   for r in sem_localizacao)
        col_reg_w    = max(len(r["regional"]) for r in sem_localizacao)
        header = (
            f"  {'ID':<{col_id_w}}  {'Nome':<{col_nome_w}}  "
            f"{'Cidade':<{col_cidade_w}}  {'Regional':<{col_reg_w}}  Motivo"
        )
        print(header)
        print("  " + "─" * (len(header) - 2))
        for r in sorted(sem_localizacao, key=lambda x: (x["regional"], x["id"])):
            print(
                f"  {r['id']:<{col_id_w}}  {r['nome']:<{col_nome_w}}  "
                f"{r['cidade']:<{col_cidade_w}}  {r['regional']:<{col_reg_w}}  {r['motivo']}"
            )

    if nao_vinculados:
        if sem_vinculo_real:
            _titulo(f"⚠️  KML SEM VÍNCULO NA PLANILHA ({len(sem_vinculo_real)})")
            for nome, id_encontrado, path in sem_vinculo_real:
                label = f"ID={id_encontrado}" if id_encontrado != "sem ID" else "sem ID reconhecível"
                print(f"  • [{label}] \"{nome}\"")

        if excluidos_situacao:
            _titulo(f"🚦 KML COM REGISTRO 'LANÇADO' (excluído do processamento) ({len(excluidos_situacao)})")
            for nome, id_encontrado, path in excluidos_situacao:
                print(f"  • [ID={id_encontrado}] \"{nome}\"")

    print("\n" + "═"*LARGURA)
    print("  👉 Próximo passo: faça commit e push do data.json para")
    print("     o repositório. O site atualizará automaticamente.")
    print("═"*LARGURA + "\n")


if __name__ == "__main__":
    main()
