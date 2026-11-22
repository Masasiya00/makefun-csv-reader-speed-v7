// Pembaca CSV cepat, pengganti drop-in untuk csv-reader 1.0.0.
//
// Membaca teks sekali dari kiri ke kanan. Jalur yang paling sering
// dilewati -- field tanpa kutip -- tidak memeriksa karakter satu per
// satu: ia memakai pencarian substring bawaan mesin untuk melompat
// langsung ke pemisah berikutnya (koma atau LF). Posisi CR liar
// dihitung sekali di awal teks dan diikuti dengan pointer monotonik,
// jadi field tanpa kutip tidak pernah mencari CR sendiri. Hanya field
// berkutip dan tempelan setelah kutip penutup yang masuk ke jalur
// lambat, dan jumlah keduanya kecil dibanding jumlah seluruh field.
//
// Aturan yang diterapkan (sesuai spesifikasi perilaku):
// - U+FEFF di awal teks dibuang.
// - Record berakhir di LF atau CRLF; baris kosong dilewati.
// - CR di luar kutip yang tidak diikuti LF dibuang (stray_cr).
// - Field berkutip berakhir di kutip yang tidak digandakan; "" di
//   dalamnya berarti satu kutip; CRLF atau CR sendirian di dalamnya
//   dibaca sebagai LF. Sisa setelah kutip penutup ditempelkan apa
//   adanya (quote_junk bila ada isinya).
// - Kutip pembuka yang tidak pernah menemukan pasangan adalah
//   karakter biasa dan teks setelahnya dibaca ulang sebagai field
//   tanpa kutip (unterminated_quote).
// - Kutip di dalam field tanpa kutip adalah karakter biasa.
// - Field tidak pernah dipangkas atau diubah tipenya.
// - Setiap record disamakan lebarnya dengan record pertama
//   (short_row / long_row), dan setiap kesalahan membawa nomor
//   baris tempat record itu dimulai serta indeks record itu di rows
//   (null untuk header).
const QUOTE = 34;
const COMMA = 44;
const LF = 10;
const CR = 13;
const BOM = 0xfeff;

export function run(input) {
  const text = input.text;
  const hasHeader = input.header;
  const total = text.length;

  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let line = 1;
  let cursor = 0;
  if (total > 0 && text.charCodeAt(0) === BOM) cursor = 1;

  // Semua posisi CR yang tidak diikuti LF, sekali di awal.
  // lp menunjuk posisi pertama pada/ setelah cursor.
  const lone = [];
  let rp = text.indexOf("\r", 0);
  while (rp !== -1) {
    if (rp + 1 >= total || text.charCodeAt(rp + 1) !== LF) lone.push(rp);
    rp = text.indexOf("\r", rp + 1);
  }
  let lp = 0;

  for (;;) {
    const rowIndex = width < 0 ? (hasHeader ? null : 0) : rows.length;

    while (lp < lone.length && lone[lp] < cursor) lp++;
    while (cursor < total) {
      const ch = text.charCodeAt(cursor);
      if (ch === LF) {
        cursor += 1;
        line += 1;
      } else if (ch === CR) {
        if (cursor + 1 < total && text.charCodeAt(cursor + 1) === LF) {
          cursor += 2;
          line += 1;
        } else {
          errors.push({ code: "stray_cr", line, row: rowIndex });
          cursor += 1;
          lp++;
        }
      } else {
        break;
      }
    }
    if (cursor >= total) break;

    const startLine = line;
    const fields = [];
    let recordDone = false;

    while (!recordDone) {
      while (lp < lone.length && lone[lp] < cursor) lp++;
      let value = null;

      if (text.charCodeAt(cursor) === QUOTE) {
        let scan = cursor + 1;
        let pieces = null;
        let closeAt = -1;
        for (;;) {
          const hit = text.indexOf('"', scan);
          if (hit === -1) break;
          if (hit + 1 < total && text.charCodeAt(hit + 1) === QUOTE) {
            if (pieces === null) pieces = [];
            pieces.push(text.slice(scan, hit), '"');
            scan = hit + 2;
            continue;
          }
          closeAt = hit;
          break;
        }

        if (closeAt === -1) {
          errors.push({
            code: "unterminated_quote",
            line: startLine,
            row: rowIndex,
          });
          value = null;
        } else {
          if (pieces === null) {
            value = text.slice(cursor + 1, closeAt);
          } else {
            pieces.push(text.slice(scan, closeAt));
            value = pieces.join("");
          }
          if (
            value.indexOf("\r") !== -1 ||
            value.indexOf("\n") !== -1
          ) {
            const flat = value.replace(/\r\n?/g, "\n");
            line += flat.split("\n").length - 1;
            value = flat;
          }

          let junkAt = closeAt + 1;
          if (junkAt >= total) {
            cursor = total;
            recordDone = true;
          } else {
            const after = text.charCodeAt(junkAt);
            if (after === COMMA) {
              cursor = junkAt + 1;
            } else if (after === LF) {
              cursor = junkAt + 1;
              line += 1;
              recordDone = true;
            } else if (
              after === CR &&
              junkAt + 1 < total &&
              text.charCodeAt(junkAt + 1) === LF
            ) {
              cursor = junkAt + 2;
              line += 1;
              recordDone = true;
            } else {
              let junk = "";
              let scanAt = junkAt;
              for (;;) {
                const commaAt = text.indexOf(",", scanAt);
                const lfAt = text.indexOf("\n", scanAt);
                const crAt = text.indexOf("\r", scanAt);
                let cut = -1;
                let kind = 0;
                if (commaAt !== -1) {
                  cut = commaAt;
                  kind = 1;
                }
                if (lfAt !== -1 && (cut === -1 || lfAt < cut)) {
                  cut = lfAt;
                  kind = 2;
                }
                if (crAt !== -1 && (cut === -1 || crAt < cut)) {
                  cut = crAt;
                  kind = 3;
                }
                if (cut === -1) {
                  junk += text.slice(scanAt);
                  cursor = total;
                  recordDone = true;
                  break;
                }
                if (kind === 1) {
                  junk += text.slice(scanAt, cut);
                  cursor = cut + 1;
                  break;
                }
                if (kind === 2) {
                  junk += text.slice(scanAt, cut);
                  cursor = cut + 1;
                  line += 1;
                  recordDone = true;
                  break;
                }
                if (
                  cut + 1 < total &&
                  text.charCodeAt(cut + 1) === LF
                ) {
                  junk += text.slice(scanAt, cut);
                  cursor = cut + 2;
                  line += 1;
                  recordDone = true;
                  break;
                }
                errors.push({
                  code: "stray_cr",
                  line: startLine,
                  row: rowIndex,
                });
                junk += text.slice(scanAt, cut);
                scanAt = cut + 1;
              }
              if (junk.length > 0) {
                value += junk;
                errors.push({
                  code: "quote_junk",
                  line: startLine,
                  row: rowIndex,
                });
              }
            }
          }
        }
      }

      if (value === null) {
        // Field tanpa kutip: hanya dua pencarian (koma, LF).
        // CR liar dicek lewat pointer daftar, bukan pencarian baru.
        let fieldStart = cursor;
        let pieces = null;
        for (;;) {
          const commaAt = text.indexOf(",", fieldStart);
          const lfAt = text.indexOf("\n", fieldStart);
          let cut = -1;
          let kind = 0;
          if (commaAt !== -1) {
            cut = commaAt;
            kind = 1;
          }
          if (lfAt !== -1 && (cut === -1 || lfAt < cut)) {
            cut = lfAt;
            kind = 2;
          }
          const strayAt = lp < lone.length ? lone[lp] : -1;
          if (
            strayAt !== -1 &&
            strayAt >= fieldStart &&
            (cut === -1 || strayAt < cut)
          ) {
            errors.push({
              code: "stray_cr",
              line: startLine,
              row: rowIndex,
            });
            if (pieces === null) pieces = [];
            pieces.push(text.slice(fieldStart, strayAt));
            lp++;
            fieldStart = strayAt + 1;
            continue;
          }
          if (cut === -1) {
            if (pieces === null) {
              value = text.slice(fieldStart);
            } else {
              pieces.push(text.slice(fieldStart));
              value = pieces.join("");
            }
            cursor = total;
            recordDone = true;
            break;
          }
          if (kind === 1) {
            if (pieces === null) {
              value = text.slice(fieldStart, cut);
            } else {
              pieces.push(text.slice(fieldStart, cut));
              value = pieces.join("");
            }
            cursor = cut + 1;
            break;
          }
          // LF: periksa apakah CR tepat sebelumnya (CRLF).
          const crlf =
            cut > fieldStart && text.charCodeAt(cut - 1) === CR;
          if (pieces === null) {
            value = text.slice(fieldStart, crlf ? cut - 1 : cut);
          } else {
            pieces.push(text.slice(fieldStart, crlf ? cut - 1 : cut));
            value = pieces.join("");
          }
          cursor = cut + 1;
          line += 1;
          recordDone = true;
          break;
        }
      }

      fields.push(value);
    }

    if (width < 0) {
      width = fields.length;
      if (hasHeader) {
        columns = fields;
      } else {
        rows.push(fields);
      }
    } else if (fields.length < width) {
      errors.push({
        code: "short_row",
        line: startLine,
        row: rowIndex,
        fields: fields.length,
      });
      while (fields.length < width) fields.push("");
      rows.push(fields);
    } else if (fields.length > width) {
      const extra = fields.splice(width);
      errors.push({
        code: "long_row",
        line: startLine,
        row: rowIndex,
        extra,
      });
      rows.push(fields);
    } else {
      rows.push(fields);
    }
  }

  return { columns, rows, errors };
}
