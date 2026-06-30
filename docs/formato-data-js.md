# Formato do arquivo `data.js`

O arquivo `data.js` é gerado automaticamente pelo script `gerar_data.py` e **não deve ser editado manualmente**. Ele exporta uma única constante global `DATA` consumida por `app.js`.

---

## Estrutura raiz

```javascript
const DATA = {
  items:            [...],   // Array de terrenos
  colors:           {...},   // Mapeamento regional → cor hex
  stats:            {...},   // Estatísticas globais
  regional_summary: {...},   // Resumo por regional
  last_updated:     "..."    // String de data/hora da última geração
};
```

---

## `items[]`

Cada entrada representa um terreno. Pode ter origem apenas no KML, apenas na planilha, ou em ambos.

```javascript
{
  id:  "MAP001",              // ID único no formato MAP### (extraído do nome do arquivo KML ou da planilha)
  n:   "Nome do Terreno",     // Nome extraído do KML (tag <name> do Document)
  p:   [                      // Lista de polígonos (pode ser [] se sem KML)
    [[lat, lng], [lat, lng], ...]   // Um polígono = lista de pares [lat, lng]
  ],
  c:   [-15.123, -47.456],    // Centroide calculado [lat, lng] (null se sem geometria)
  e:   { ... }                // Dados da planilha (null se KML sem vínculo na planilha)
}
```

### Campo `e` — dados da planilha

```javascript
e: {
  nome:                "Nome do Empreendimento",
  codigo:              "CJD06",
  regional:            "CENTRO OESTE",
  cidade:              "Brasília",
  uf:                  "DF",
  empreendimento:      "Nome do Empreendimento Completo",
  tipo:                "Loteamento",
  year:                2025,
  on_off:              1,           // 1 = Ativo, 0 = Inativo
  area_total:          150000,      // Em m²
  total_unidades:      320,
  vgv_total:           48.5,        // Em R$ milhões
  vgv_bt:              24.25,       // Em R$ milhões (participação Buriti)
  custo_terreno:       8.2,         // Em R$ milhões (Pré Rateio)
  custo_construcao:    32.1,        // Em R$ milhões (Pré Rateio)
  participacao_buriti: 50,          // Em percentual (%)
  data_lancamento:     "2025-03-01" // String ISO ou null
}
```

> Campos numéricos ausentes na planilha chegam como `null`. Datas chegam como string `"YYYY-MM-DD"` ou `null`.

---

## `colors{}`

Mapeamento de regional para cor hexadecimal. Definido em `gerar_data.py` (dict `CORES`) — esta é a **única fonte de verdade** das cores.

```javascript
colors: {
  "NORTE":           "#c0392b",
  "NORDESTE I":      "#d35400",
  "NORDESTE II":     "#e67e22",
  "CENTRO OESTE":    "#27ae60",
  "CENTRO OESTE II": "#16a085",
  "SUDESTE":         "#2980b9",
  "SUL":             "#8e44ad",
  "TOCANTINS":       "#0e6655",
  "OESTE":           "#c2185b",
  "None":            "#7f8c8d"
}
```

---

## `stats{}`

Estatísticas globais calculadas sobre todos os itens vinculados (com campo `e` preenchido).

```javascript
stats: {
  total:          142,        // Total de itens (KML + planilha)
  total_planilha: 138,        // Itens com dados na planilha
  total_ativo:    110,        // Itens com on_off = 1
  total_inativo:  28,         // Itens com on_off = 0
  total_units:    18500,      // Soma de total_unidades
  total_area:     4200000,    // Soma de area_total em m²
  total_vgv:      1850.5,     // Soma de vgv_total em R$ milhões
  total_vgv_bt:   925.25      // Soma de vgv_bt em R$ milhões
}
```

---

## `regional_summary{}`

Resumo agregado por regional, calculado apenas sobre itens ativos (`on_off = 1`).

```javascript
regional_summary: {
  "NORTE": {
    count: 12,          // Quantidade de itens
    units: 1800,        // Soma de unidades
    vgv:   210.5        // Soma de VGV Total em R$ milhões
  },
  // ... uma entrada por regional presente nos dados
}
```

---

## `last_updated`

String em português com a data e hora da última execução do `gerar_data.py`.

```javascript
last_updated: "Dados atualizados em 30 de junho de 2026 às 14:32"
```

---

## Itens sem vínculo

| Situação | `e` | `p` | `c` |
|---|---|---|---|
| KML + planilha | `{ ... }` | `[[...]]` | `[lat, lng]` |
| Só KML (sem linha na planilha) | `null` | `[[...]]` | `[lat, lng]` |
| Só planilha (sem arquivo KML) | `{ ... }` | `[]` | `null` |

No `app.js`, a função `isLinked(item)` retorna `true` quando `item.e` é não-nulo e `item.e.regional` é não-nulo.
