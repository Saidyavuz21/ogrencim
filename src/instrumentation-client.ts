// Uygulama etkileşime açılmadan önce çalışır: tarayıcıdaki beklenmedik hataları
// kişisel veriler temizlenerek kaydeder (src/lib/errorReporting.ts).
import { installErrorReporting } from './lib/errorReporting';

try {
  installErrorReporting();
} catch {
  /* hata kaydı kurulamazsa uygulama yine çalışır */
}
