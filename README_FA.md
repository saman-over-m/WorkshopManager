# Workshop Manager Windows — v3 GitHub Test

این نسخه از **Workshop Manager WEB v16** به عنوان پایه ساخته شده و بخش **FactorPlus V32** داخل خود برنامه قرار گرفته است. ویژگی صدای نسخه‌های بعدی عمداً در این نسخه وارد نشده است.

## مرحله فعلی
این نسخه برای تست GitHub و GitHub Actions ساخته شده و هنوز ادعای «نسخه نهایی EXE» ندارد.

### پایگاه داده
- SQLite واقعی: `%APPDATA%\\Workshop Manager\\Data\\workshop.sqlite`
- اطلاعات کارتکس، مشتری، تأمین‌کننده، تعمیرکار، خرید گاراژ و تنظیمات در SQLite نگهداری می‌شود.
- فاکتورهای FactorPlus نیز در SQLite ذخیره می‌شوند.

### پشتیبان
- پوشه: `Documents\\Workshop Manager Backups`
- پشتیبان دستی از داخل برنامه
- زمان‌بندی روزانه: 23:55
- زمان‌بندی هفتگی: پنجشنبه 17:00
- فایل پشتیبان SQLite با `VACUUM INTO` ساخته می‌شود تا یک نسخه قابل بازیابی داشته باشیم.

### فاکتورها
فاکتورپلاس داخل همان صفحه Workshop Manager قرار دارد و پنجره جدا یا `window.open` برای اجرای فاکتور استفاده نمی‌شود.

## اجرای محلی برای توسعه
```bash
npm ci
npm run check
npm test
npm start
```

## GitHub Actions
فایل workflow در `.github/workflows/windows-test.yml` قرار دارد. ابتدا تست‌های SQLite و ماندگاری اطلاعات اجرا می‌شوند؛ ساخت EXE مرحله جداگانه است.

## نکته مهم
برای ساخت EXE ویندوز، GitHub Actions باید روی `windows-latest` اجرا شود. بعد از سبز شدن تست‌ها، workflow ساخت Installer با Electron Builder فعال می‌شود.
