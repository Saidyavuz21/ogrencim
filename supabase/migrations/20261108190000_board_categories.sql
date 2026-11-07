-- Tahtalarım: öğretmenin kendi oluşturduğu kategoriler (ör. "1. Ünite", "LGS tekrar")
alter table public.boards
  add column if not exists category text check (category is null or char_length(category) <= 60);
create index if not exists boards_teacher_category_idx on public.boards (teacher_id, category);
