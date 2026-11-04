-- ========================================================
-- Davranış puanı 0'dan başlar ve eksiye düşebilir
-- (önceden yeni öğrenci 100 puanla başlıyordu)
-- ========================================================

alter table public.students alter column points set default 0;

-- Mevcut öğrencilerin puanı = verilen artı/eksilerin toplamı
update public.students s
   set points = coalesce((select sum(h.amount) from public.points_history h where h.student_id = s.id), 0);
