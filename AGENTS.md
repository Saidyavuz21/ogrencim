<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ortak arayüz kuralları — tüm kodlama ajanları

- Yeni sayfa oluşturmadan veya arayüzü değiştirmeden önce [DESIGN.md](DESIGN.md) ve [docs/UI_KURALLARI.md](docs/UI_KURALLARI.md) dosyalarını oku ve uygula.
- Yeni öğretmen sayfaları ortak kabuk, yeşil/sıcak nötr palet, küçük çerçevesiz başlık, kompakt liste ve mevcut özel seçim bileşenleriyle uyumlu olmalı.
- Masaüstü ve mobil kapsamını ayrı koru; tek görünüme yönelik isteği diğerine yayma.
- Tasarım çalışması veri, yetki, kayıt, hesaplama ve tam ekran davranışını değiştirmez. Kod kontrolü görsel doğrulama sayılmaz.
- `docs/TASARIM_DILI.md` tarihsel öneridir; `.impeccable/design.json` yardımcı kayıttır. İkisi de DESIGN.md ve UI kurallarının önüne geçmez.
- Bu kurallar Codex, Claude, Gemini ve diğer ajanlar için ortaktır. Kullanıcının daha yeni açık talebi önceliklidir.

## graphify

- Kullanıcı `/graphify` yazarsa başka işleme başlamadan önce kurulu graphify becerisini oku ve uygula.
