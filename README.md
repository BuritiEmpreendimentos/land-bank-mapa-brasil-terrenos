# Land Bank: Brasil Terrenos

Plataforma web interativa para visualização e gestão do banco de terrenos da **Brasil Terrenos**. A aplicação exibe empreendimentos imobiliários em um mapa interativo, com polígonos georreferenciados extraídos de arquivos KML e dados financeiros e operacionais provenientes de uma planilha Excel.

---

## Funcionalidades Principais

### Mapa Interativo
- Visualização de polígonos de terrenos sobre mapa base (OpenStreetMap) ou satélite (Esri/Google)
- Coloração dos polígonos por regional, com legenda dinâmica
- Marcadores de centroide para terrenos sem polígono cadastrado
- Popups com ficha completa do empreendimento ao clicar no mapa ou na lista lateral

### Sidebar de Navegação
- **Dashboard de estatísticas**: total de empreendimentos, terrenos no mapa (KML), total de unidades, área total e VGV
- **Busca textual** por nome do terreno, cidade ou regional
- **Filtros por regional** com chips coloridos (NORTE, NORDESTE I, NORDESTE II, CENTRO OESTE, SUDESTE, SUL, TOCANTINS, OESTE, etc.)
- **Filtro "Vinculados"**: exibe apenas terrenos com dados da planilha vinculados
- **Lista de terrenos** com nome, cidade, regional, unidades e indicadores visuais de status

### Popup de Detalhes
Ao selecionar um terreno, exibe:
- Tipo de empreendimento (Loteamento / Condomínio)
- Ano previsto de lançamento
- Área total (em hectares)
- Total de unidades
- VGV Total e VGV BT (em R$ milhões)
- Custo do terreno e custo de construção
- Participação Buriti (%)
- Status ON / OFF

### Responsividade Mobile
- Sidebar em modo drawer deslizante com overlay
- Botão de menu flutuante no mapa
- Suporte a toque e gestos

### Controle de Camadas
- Alternância entre mapa de ruas (OpenStreetMap) e imagem de satélite
- Painel colapsável de camadas no canto superior direito do mapa

---

## Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| HTML5 | — | Estrutura da página |
| CSS3 | — | Estilo e responsividade |
| JavaScript (Vanilla) | ES6+ | Lógica da aplicação |
| [Leaflet.js](https://leafletjs.com/) | 1.9.4 | Biblioteca de mapas interativos |
| DM Sans / JetBrains Mono | — | Tipografia (Google Fonts) |

### Pipeline de Dados (Python)
| Tecnologia | Versão mínima | Uso |
|---|---|---|
| Python | 3.11 | Script de geração do `data.js` |
| `openpyxl` | 3.1.0 | Leitura da planilha Excel (`.xlsx`) |
| `lxml` | 5.0.0 | Parsing dos arquivos KML |
| `json` / `math` / `pathlib` | — | Utilitários padrão |

### Formatos de Dados
| Formato | Uso |
|---|---|
| `.kml` | Polígonos georreferenciados dos terrenos (Google Earth) |
| `.xlsx` | Planilha com dados financeiros e operacionais |
| `data.json` | Arquivo gerado — carregado via `fetch()` em `app.js` em tempo de execução |

---

## Estrutura do Repositório

```
land-bank-mapa-brasil-terrenos/
│
├── index.html                        # Página principal (raiz — GitHub Pages)
│
├── src/                              # Aplicação web completa
│   ├── app.js                        # Orquestrador (entry point)
│   ├── state.js                      # Dados globais e estado da aplicação
│   ├── utils.js                      # Funções de formatação e helpers
│   ├── filters.js                    # Filtros: construtores e lógica
│   ├── map.js                        # Mapa Leaflet: camadas e marcadores
│   ├── ui.js                         # Interface: lista, popup, stats, sidebar
│   ├── styles.css                    # Estilos CSS
│   ├── data.json                     # GERADO — não editar manualmente
│   └── assets/
│       ├── favicons/                 # Favicon e ícones PWA
│       └── images/                   # Logo e demais imagens
│
├── data/                             # Fontes de dados brutas
│   ├── areas_land_bank_com_id.xlsx   # Planilha com dados dos empreendimentos
│   └── kml/                          # Arquivos KML (polígonos georreferenciados)
│       └── MAP*.kml                  # Nomeação: MAP{número}_{descrição}.kml
│
├── scripts/                          # Pipeline de processamento
│   └── gerar_data.py                 # Gera src/data.js a partir de data/ 
│
├── docs/
│   ├── guia-atualizacao.md           # Como adicionar e editar terrenos
│   ├── referencia-colunas.md         # Referência das colunas da planilha
│   └── formato-data-js.md            # Estrutura do arquivo data.js gerado
│
├── requirements.txt                  # Dependências Python do pipeline
├── .python-version                   # Versão Python requerida
├── .gitignore
├── README.md
└── .vscode/
    └── settings.json.example         # Configuração recomendada do Live Server
```

---

## Pipeline de Atualização de Dados

O site é alimentado pelo arquivo `data.json`, gerado automaticamente pelo script `gerar_data.py` e carregado via `fetch()` em `app.js`. O fluxo é:

```
data/areas_land_bank_com_id.xlsx  ───┐
                                     ├──► scripts/gerar_data.py  ──►  src/data.json  ──►  Site
data/kml/*.kml                    ───┘
```

### Como gerar o `data.json`

**Pré-requisito:** Python 3.11 ou superior.

**1. Instale as dependências Python:**
```bash
pip install -r requirements.txt
```

**2. Execute o script a partir da pasta `scripts/`:**
```bash
cd scripts
python gerar_data.py
```

**3. Faça commit e push do `src/data.json` gerado:**
```bash
git add src/data.json
git commit -m "dados: atualiza data.json"
git push
```

O site atualizará automaticamente após o push.

### Configuração do script (`scripts/gerar_data.py`)

No início do arquivo, edite as seguintes variáveis conforme necessário:

| Variável | Padrão | Descrição |
|---|---|---|
| `EXCEL_PATH` | `../data/areas_land_bank_com_id.xlsx` | Caminho da planilha Excel |
| `EXCEL_SHEET` | `"AREAS"` | Nome da aba da planilha com os dados. **Importante:** o workbook tem várias abas (`AREAS`, `Painel`, `Excluído da base`, etc.) — se essa variável for `None`, o script lê `wb.active`, que é a aba marcada como selecionada no arquivo salvo no Excel (nem sempre `AREAS`), podendo vir vazia. |
| `KML_FOLDER` | `../data/kml` | Pasta com os arquivos KML |
| `OUTPUT_PATH` | `../src/data.json` | Arquivo de saída |
| `COLUNA_ID` | `ID` | Coluna da planilha usada como chave de vinculação |
| `ID_REGEX` | `^(MAP\d+)` | Padrão usado para extrair o ID do início do nome do arquivo KML |

O script também detecta automaticamente a linha de cabeçalho dentro da aba: percorre as linhas até achar a primeira cujo primeiro valor não-nulo seja exatamente `"ID"`.

### Lógica de vinculação KML ↔ Planilha

O script extrai o ID (`MAP###`) do início do nome do arquivo KML (ou, na ausência, da tag `<name>` do KML) e vincula com a coluna **`ID`** da planilha — essa é a chave de vinculação, não o nome do empreendimento. Múltiplos KMLs com o mesmo ID têm seus polígonos unidos num único item por linha correspondente da planilha.

### Filtro por Situação do Empreendimento

A planilha possui a coluna **"Situação do Empreendimento"**, que pode conter os valores `A lançar` ou `Lançado`. O script processa **apenas os registros com situação "A lançar"** — registros marcados como "Lançado" são descartados logo após a leitura do Excel, antes de qualquer vinculação com KML ou cálculo de estatísticas (`total_planilha`, área, VGV, unidades etc.). Um ID pode ter situação mista (algumas linhas "A lançar", outras "Lançado") — nesse caso ele segue no processamento, mas o relatório do script sinaliza a situação mista.

Esse filtro é aplicado pela função `filtrar_por_situacao()` em `gerar_data.py`, controlada pelas constantes:

| Constante | Padrão | Descrição |
|---|---|---|
| `COLUNA_SITUACAO` | `Situação do Empreendimento` | Nome da coluna na planilha |
| `SITUACAO_INCLUIDA` | `A LANÇAR` | Valor (normalizado para maiúsculas) que é mantido no processamento |

Se a coluna não existir na aba, o script emite um aviso no console e segue processando todos os registros normalmente (sem filtro).

### Terrenos sem localização

Itens sem polígono e sem centroide (`p: []`, `c: null`) — seja por falta de KML ou por KML sem geometria válida — não aparecem no mapa, mas continuam na lista lateral com um badge de destaque "⚠ sem localização" (`src/ui.js`, classe `.no-location` em `src/styles.css`). O relatório do script lista esses casos na seção "SEM LOCALIZAÇÃO".

---

## Regionais e Cores

| Regional | Cor |
|---|---|
| NORTE | `#c0392b` |
| NORDESTE I | `#d35400` |
| NORDESTE II | `#e67e22` |
| CENTRO OESTE | `#27ae60` |
| CENTRO OESTE II | `#16a085` |
| SUDESTE | `#2980b9` |
| SUL | `#8e44ad` |
| TOCANTINS | `#0e6655` |
| OESTE | `#c2185b` |

---

## Como Executar Localmente

Por ser uma aplicação estática (HTML + JS + CSS), basta servir a pasta `src/` com qualquer servidor HTTP local:

```bash
# Com Python (a partir da raiz do projeto)
python -m http.server 8000

# Com Node.js (npx)
npx serve .
```

Acesse em: `http://localhost:8000`

> **Atenção:** Não abra o `index.html` diretamente no navegador (`file://`) pois o uso de ES Modules requer um servidor HTTP.

**VS Code — Live Server:** copie `.vscode/settings.json.example` para `.vscode/settings.json`. A configuração já aponta para a raiz do projeto na porta `5501`.

---

## Deploy

A aplicação é um site estático, qualquer hospedagem de arquivos estáticos funciona (GitHub Pages, Netlify, servidor próprio, etc.).

**Fluxo atual (manual):**

1. Atualizar `areas_land_bank_com_id.xlsx` e/ou arquivos em `kml/`
2. Rodar `python gerar_data.py` (a partir da pasta `scripts/`) para gerar o `data.json` atualizado
3. Commitar e fazer push do `data.json`:
   ```bash
   git add src/data.json
   git commit -m "dados: atualiza data.json"
   git push
   ```
4. O servidor/hospedagem serve os arquivos atualizados

> O `data.json` é o único arquivo que muda a cada atualização de dados, os demais (`index.html`, `app.js`, `styles.css`) só mudam quando há alterações na aplicação.

---

## Dados Exibidos no Dashboard

O dashboard na sidebar exibe as seguintes métricas agregadas, calculadas automaticamente pelo `gerar_data.py` a partir da planilha:

- **Empreendimentos**: total de itens no banco de terrenos
- **No Mapa (KML)**: quantidade de terrenos com polígono georreferenciado
- **Total de Unidades**: soma de unidades habitacionais de todos os empreendimentos
- **Área Total**: soma das áreas dos polígonos KML (em hectares)
- **VGV Total / VGV BT**: Valor Geral de Vendas total e da participação Buriti Terrenos (em R$ milhões)

---

## Estrutura do `data.json`

O arquivo gerado é um JSON simples, carregado via `fetch('src/data.json')` em `app.js`:

```javascript
{
  "items": [
    {
      "id": "MAP001",                   // ID no formato MAP### (chave de vinculação)
      "n":  "Nome do Terreno",          // Nome (tag <name> do KML ou nome do arquivo)
      "p":  [[[lat, lng], ...]],        // Lista de polígonos ([] se sem KML/geometria)
      "c":  [lat, lng],                 // Centroide (null se sem geometria)
      "e":  {                           // Dados da planilha (null se sem vínculo)
        "nome": "...", "codigo": "...", "regional": "...", "cidade": "...", "uf": "...",
        "empreendimento": "...", "tipo": "...", "year": "...",
        "on_off": 1, "area_total": 0, "total_unidades": 0,
        "vgv_total": 0, "vgv_bt": 0,
        "custo_terreno": 0, "custo_construcao": 0,
        "participacao_buriti": 0, "data_lancamento": "..."
      }
    }
    // ...
  ],
  "colors": { "NORTE": "#c0392b", "...": "..." },  // Mapeamento regional → cor
  "stats": {                                        // Estatísticas globais
    "total": 0, "total_planilha": 0, "total_ativo": 0, "total_inativo": 0,
    "total_units": 0, "total_area": 0, "total_vgv": 0, "total_vgv_bt": 0
  },
  "regional_summary": {                             // Resumo por regional
    "NORTE": { "count": 0, "units": 0, "vgv": 0 }
    // ...
  },
  "last_updated": "Dados atualizados em 6 de julho de 2026"
}
```

> Detalhamento completo de cada campo em [`docs/formato-data-js.md`](docs/formato-data-js.md).