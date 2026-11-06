-- ========================================================
-- ÖDEV YALNIZCA ÖĞRETMENİN KENDİ SINIFLARINA VERİLEBİLİR
--  Önceki kural yalnızca "personel mi?" bakıyordu: öğretmen okutmadığı bir sınıfa da
--  ödev ekleyebiliyordu (arayüz engelliyordu, veritabanı engellemiyordu).
--  Artık: admin her sınıfa; öğretmen yalnızca rehberlik sınıfına ve "Sınıflarım"
--  listesindeki sınıflara (teacher_has_class). Birden çok sınıfa ödev göndermede
--  her sınıf ayrı ayrı denetlenir.
-- ========================================================

drop policy if exists homeworks_insert on public.homeworks;
create policy homeworks_insert on public.homeworks for insert to authenticated
  with check ((select public.is_staff()) and (select public.teacher_has_class(class_name)));
