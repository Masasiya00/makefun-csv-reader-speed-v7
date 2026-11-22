# Fast CSV Reader v7

[![csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/competitions/csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Masasiya00/makefun-csv-reader-speed-v7/rank.svg)](https://make.fun/competitions/csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Masasiya00/makefun-csv-reader-speed-v7/reward.svg)](https://make.fun/competitions/csv-reader-speed-01-run-20261121)

Pengganti drop-in yang lebih cepat untuk csv-reader 1.0.0 pada kompetisi
[csv-reader-speed-01-run-20261121](https://make.fun/competitions/csv-reader-speed-01-run-20261121):
menjawab persis sama untuk setiap kasus, tetapi dengan waktu CPU yang
lebih kecil. Pure JavaScript/TypeScript, tanpa dependensi, tanpa
WebAssembly, tanpa biner.

## Cara kerja

`solve.js` mengekspor `run({ text, header })` yang membaca teks sekali
dari kiri ke kanan. Field tanpa kutip — jalur yang paling sering dilewati —
tidak diperiksa karakter demi karakter: ia melompat ke pemisah berikutnya
dengan pencarian substring bawaan mesin (koma atau LF), sementara posisi
CR liar dihitung sekali di awal dan diikuti dengan pointer monotonik.
Hanya field berkutip dan tempelan setelah kutip penutup yang masuk ke
jalur lambat. `main.ts` membaca `/input/cases.json` (atau
`MAKEFUN_INPUT_DIR`), menjawab tiap kasus sendiri-sendiri dengan `run`,
dan menulis `/output/answers.json` (atau `MAKEFUN_OUTPUT_DIR`) sedikit
demi sedikit lewat stream, supaya tidak ada string raksasa yang dibangun.

## Hasil pengukuran (set latihan, mesin ini, Node v24.22.1)

Set latihan: 6 kasus, total teks ~10,6 MB, ~64 ribu record, ~710 ribu
field. Waktu dinding proses baru (`node main.ts`), 7 run berurutan:

| Run | Waktu dinding |
| --- | --- |
| 1 | 669 ms |
| 2 | 605 ms |
| 3 | 653 ms |
| 4 | 648 ms |
| 5 | 628 ms |
| 6 | 656 ms |
| 7 | 638 ms |
| **Median** | **648 ms** |
| Min – maks | 605 – 669 ms |

Kebenaran: pemeriksa kit (`grade-local`, driver process) memberi
`passed: 1`, `cases_passed: 6/6`, dan L1 regrade mereproduksi keluaran
byte demi byte. Dua kali jalan pada set yang sama menghasilkan
`answers.json` yang identik byte demi byte (deterministik).

## Berkas

- `solve.js` — modul ES tanpa dependensi, mengekspor `run`.
- `main.ts` — program penggerak (membaca kasus, menulis jawaban).
- `package.json` — penanda modul ES.
- `LICENSE` — MIT.
