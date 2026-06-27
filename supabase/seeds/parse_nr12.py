"""Gera os standard_items do CORPO da NR-12 (módulos 12.3 a 12.18) a partir do
texto do PDF oficial. Reprodutível — em vez de digitar centenas de cláusulas.

Pipeline:
  1) extrair o texto do PDF:  pypdf -> nr12_text.txt
  2) rodar este parser:       python parse_nr12.py nr12_text.txt itens.sql

Regras:
  - cada cláusula numerada (12.X.Y...) vira um standard_item;
  - listas a/b/c ficam DENTRO do texto do item (é uma pergunta de checklist);
  - hierarquia (parent_item_id) derivada da numeração;
  - módulo 12.1 (principiológico) e 12.2 (feito à mão) ficam de fora;
  - anexos são fase à parte (numeração própria).
"""
import re
import sys
import uuid
from collections import Counter

NS = uuid.UUID("12000000-0000-0000-0000-000000000019")  # namespace = uuid da versão
# limites do corpo no texto extraído (12.1 começa aqui; ANEXO I logo após)
BODY_START, BODY_END = 71, 1327


def main():
    src, out = sys.argv[1], sys.argv[2]
    with open(src, encoding="utf-8") as f:
        lines = f.readlines()

    clean = [
        s.rstrip("\n")
        for s in lines[BODY_START:BODY_END]
        if "===== PAGE" not in s
        and "Este texto não substitui" not in s
        and s.strip()
    ]

    item_re = re.compile(r"^(12(?:\.\d+){2,})\s+(.*)$")  # 12.X.Y... = item
    sec_re = re.compile(r"^(12\.\d+)\s+\D")               # 12.X Titulo = section

    items, cur = [], None
    for s in clean:
        m = item_re.match(s)
        if m:
            if cur:
                items.append(cur)
            cur = {"number": m.group(1), "parts": [m.group(2)]}
        elif sec_re.match(s):
            if cur:
                items.append(cur)
            cur = None
        elif cur:
            cur["parts"].append(s.strip())
    if cur:
        items.append(cur)

    sec_uuid = lambda mod: f"12000000-0000-0000-0001-0000000000{mod:02d}"
    item_uuid = lambda n: str(uuid.uuid5(NS, "nr12:item:" + n))
    clean_text = lambda parts: re.sub(r"\s+", " ", " ".join(p.strip() for p in parts)).strip().replace("'", "''")

    included = [it for it in items if int(it["number"].split(".")[1]) not in (1, 2)]
    nums = {it["number"] for it in included}

    rows, pos, seen = [], 0, set()
    for it in included:
        n = it["number"]
        if n in seen:
            continue
        seen.add(n)
        comps = n.split(".")
        pos += 1
        parent = "null"
        if len(comps) >= 4 and ".".join(comps[:-1]) in nums:
            parent = "'" + item_uuid(".".join(comps[:-1])) + "'"
        rows.append(
            f"  ('{item_uuid(n)}', '{sec_uuid(int(comps[1]))}', {parent}, "
            f"'{n}', '{clean_text(it['parts'])}', {pos})"
        )

    with open(out, "w", encoding="utf-8") as f:
        f.write("-- ===== Itens dos módulos 12.3 a 12.18 (gerado por parse_nr12.py) =====\n")
        f.write("insert into standard_items\n  (id, standard_section_id, parent_item_id, number, text, position)\nvalues\n")
        f.write(",\n".join(rows))
        f.write("\non conflict do nothing;\n")

    print(f"{len(rows)} itens. Por módulo:",
          dict(sorted(Counter(int(it['number'].split('.')[1]) for it in included).items())))


if __name__ == "__main__":
    main()
