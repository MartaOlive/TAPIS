# -*- coding: utf-8 -*-
"""Fix \\n escapes in DonaCadena objects; finish remaining replacements."""
import csv
import json
import re
from pathlib import Path

ROOT = Path(r"C:\inetpub\wwwroot\TAPIS")
CSV_PATH = ROOT / "temporal" / "esquemes" / "tapis_i18n_review.csv"


def decode_escapes(s):
    if s is None:
        return s
    # CSV stores newline as the two characters \ n
    return s.replace("\\n", "\n").replace("\\t", "\t")


def load_cat():
    rows = list(csv.reader(CSV_PATH.read_text(encoding="cp850").splitlines(), delimiter=";"))
    out = {}
    for r in rows[1:]:
        if len(r) < 6:
            continue
        out[(r[0], r[1])] = {
            "cat": decode_escapes(r[4]),
            "spa": decode_escapes(r[5]),
            "eng": decode_escapes(r[3]),
        }
    return out


def obj_lit(o):
    return "{cat: %s, spa: %s, eng: %s}" % (
        json.dumps(o["cat"], ensure_ascii=False),
        json.dumps(o["spa"], ensure_ascii=False),
        json.dumps(o["eng"], ensure_ascii=False),
    )


def fix_double_backslash_n(src):
    """In DonaCadena({...}) objects, turn file \\\\n into \\n (JS newline escape)."""
    fixed = 0

    def fix_segment(m):
        nonlocal fixed
        s = m.group(0)
        # python string: two backslashes + n
        c = s.count("\\\\n")
        if c:
            fixed += c
            return s.replace("\\\\n", "\\n")
        return s

    new_src = re.sub(r"DonaCadena(?:Fmt)?\(\{[^{}]*\}", fix_segment, src)
    return new_src, fixed


def main():
    total_fixed = 0
    for name in ["tapis.js", "edc.js", "gps.js"]:
        path = ROOT / name
        src = path.read_text(encoding="utf-8")
        new_src, n = fix_double_backslash_n(src)
        if new_src != src:
            path.write_text(new_src, encoding="utf-8", newline="\n")
        print(name, "newline_fixes", n)
        total_fixed += n

    # availableAt trailing space before ));
    path = ROOT / "tapis.js"
    src = path.read_text(encoding="utf-8")
    old = "' + value + '</a>' ));"
    new = "' + value + '</a>'));"
    c = src.count(old)
    if c:
        src = src.replace(old, new)
        path.write_text(src, encoding="utf-8", newline="\n")
        print("availableAt space fixes", c)

    # parse error alert
    cat = load_cat()
    o = cat[("alert", "parseErrorFieldContent")]
    src = path.read_text(encoding="utf-8")
    old = 'alert("Parse error: " + e + " The field content is:\\n" + value);'
    new = "alert(DonaCadenaFmt(%s, e, value));" % obj_lit(o)
    print("parse found", old in src)
    print("eng repr", repr(o["eng"][:60]))
    if old in src:
        src = src.replace(old, new, 1)
        path.write_text(src, encoding="utf-8", newline="\n")
        print("parseErrorFieldContent applied")

    # verify csv fragment bytes
    text = path.read_text(encoding="utf-8")
    i = text.find("CSV parse error")
    snippet = text[i : i + 80]
    idx = snippet.find("fragment")
    chars = snippet[idx : idx + 15]
    print("csv fragment chars", [hex(ord(c)) for c in chars])
    print("total_newline_fixes", total_fixed)


if __name__ == "__main__":
    main()
