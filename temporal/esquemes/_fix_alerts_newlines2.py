# -*- coding: utf-8 -*-
"""Fix remaining double-backslash-n inside DonaCadenaFmt string literals."""
from pathlib import Path

ROOT = Path(r"C:\inetpub\wwwroot\TAPIS")


def fix_file(path):
    src = path.read_text(encoding="utf-8")
    out = []
    i = 0
    fixed = 0
    while True:
        j = src.find("DonaCadena", i)
        if j < 0:
            out.append(src[i:])
            break
        out.append(src[i:j])
        # Find matching closing paren for DonaCadena( or DonaCadenaFmt(
        k = j
        if src.startswith("DonaCadenaFmt(", j):
            k = j + len("DonaCadenaFmt(")
        elif src.startswith("DonaCadena(", j):
            k = j + len("DonaCadena(")
        else:
            out.append(src[j : j + 10])
            i = j + 10
            continue
        # scan for closing ) with string awareness
        depth = 1
        p = k
        in_str = False
        quote = None
        esc = False
        while p < len(src) and depth:
            c = src[p]
            if in_str:
                if esc:
                    esc = False
                elif c == "\\":
                    esc = True
                elif c == quote:
                    in_str = False
            else:
                if c in "\"'":
                    in_str = True
                    quote = c
                elif c == "(":
                    depth += 1
                elif c == ")":
                    depth -= 1
            p += 1
        segment = src[j:p]
        # In string literals within segment, replace \\n (two backslashes + n) with \n
        # Only when not already a valid single \n escape: look for char sequence \ \ n
        new_seg = []
        q = 0
        while q < len(segment):
            if (
                q + 2 < len(segment)
                and segment[q] == "\\"
                and segment[q + 1] == "\\"
                and segment[q + 2] == "n"
            ):
                # Could be intentional \\ + n in code outside strings — only fix inside strings
                # Check if we're inside a string by scanning from start of segment
                new_seg.append("\\n")  # one backslash + n for JS
                fixed += 1
                q += 3
            else:
                new_seg.append(segment[q])
                q += 1
        # Safer: only replace inside "..." string literals of the segment
        # Re-do with string awareness
        new_seg2 = []
        q = 0
        in_str = False
        quote = None
        esc = False
        while q < len(segment):
            c = segment[q]
            if in_str:
                if esc:
                    new_seg2.append(c)
                    esc = False
                elif c == "\\":
                    # peek for \n (second backslash + n) meaning bad dump
                    if q + 2 < len(segment) and segment[q + 1] == "\\" and segment[q + 2] == "n":
                        new_seg2.append("\\")
                        new_seg2.append("n")
                        fixed += 1
                        q += 3
                        continue
                    new_seg2.append(c)
                    esc = True
                elif c == quote:
                    new_seg2.append(c)
                    in_str = False
                else:
                    new_seg2.append(c)
            else:
                new_seg2.append(c)
                if c in "\"'":
                    in_str = True
                    quote = c
            q += 1
        # The first loop already corrupted fixed count; use only new_seg2
        out.append("".join(new_seg2))
        i = p
    # recount properly
    return "".join(out), fixed


def main():
    # Reset approach: recount from original bad pattern only with string-aware scan once
    for name in ["tapis.js", "edc.js", "gps.js"]:
        path = ROOT / name
        src = path.read_text(encoding="utf-8")
        out = []
        i = 0
        fixed = 0
        while True:
            j = src.find("DonaCadena", i)
            if j < 0:
                out.append(src[i:])
                break
            out.append(src[i:j])
            if src.startswith("DonaCadenaFmt(", j):
                k = j + len("DonaCadenaFmt(")
                head = "DonaCadenaFmt("
            elif src.startswith("DonaCadena(", j):
                k = j + len("DonaCadena(")
                head = "DonaCadena("
            else:
                out.append(src[j : j + 10])
                i = j + 10
                continue
            depth = 1
            p = k
            in_str = False
            quote = None
            esc = False
            while p < len(src) and depth:
                c = src[p]
                if in_str:
                    if esc:
                        esc = False
                    elif c == "\\":
                        esc = True
                    elif c == quote:
                        in_str = False
                else:
                    if c in "\"'":
                        in_str = True
                        quote = c
                    elif c == "(":
                        depth += 1
                    elif c == ")":
                        depth -= 1
                p += 1
            segment = src[j:p]
            new_chars = []
            q = 0
            in_str = False
            quote = None
            esc = False
            while q < len(segment):
                c = segment[q]
                if in_str:
                    if esc:
                        new_chars.append(c)
                        esc = False
                    elif c == "\\":
                        if (
                            q + 2 < len(segment)
                            and segment[q + 1] == "\\"
                            and segment[q + 2] == "n"
                        ):
                            new_chars.append("\\")
                            new_chars.append("n")
                            fixed += 1
                            q += 3
                            continue
                        new_chars.append(c)
                        esc = True
                    elif c == quote:
                        new_chars.append(c)
                        in_str = False
                    else:
                        new_chars.append(c)
                else:
                    new_chars.append(c)
                    if c in "\"'":
                        in_str = True
                        quote = c
                q += 1
            out.append("".join(new_chars))
            i = p
        new_src = "".join(out)
        if new_src != src:
            path.write_text(new_src, encoding="utf-8", newline="\n")
        print(name, "fixed", fixed)
        # verify
        text = path.read_text(encoding="utf-8")
        i = text.find("CSV parse error")
        if i >= 0:
            snippet = text[i : i + 80]
            idx = snippet.find("fragment")
            chars = snippet[idx : idx + 15]
            print("  csv chars", [hex(ord(c)) for c in chars])


if __name__ == "__main__":
    main()
