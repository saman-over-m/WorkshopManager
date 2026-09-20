# راهنمای GitHub و ساخت EXE — Workshop Manager Windows v2

این نسخه بر پایه **Workshop Manager Web v16** و **FactorPlus V32** است.

## 1) اول فقط Check در GitHub
1. یک Repository جدید بسازید؛ مثلاً `WorkshopManager`.
2. تمام محتویات این پوشه را در ریشه Repository قرار دهید؛ `package.json` باید در ریشه باشد.
3. Commit/Push کنید.
4. GitHub → Actions → **Workshop Manager - Windows Check**.
5. این Workflow فقط Syntax، Electron و وجود بخش‌های اصلی/FactorPlus را بررسی می‌کند و EXE نمی‌سازد.

## 2) بعد از سبز شدن Check، EXE
Actions → **Workshop Manager - Build Windows EXE** → Run workflow.
بعد از موفقیت، از Artifacts فایل `WorkshopManager-Windows` را دانلود کنید.

## 3) دیتابیس
دیتابیس اصلی SQLite است:
`%APPDATA%\Workshop Manager\Data\workshop.sqlite`

کارتکس‌ها، مشتریان، تأمین‌کنندگان، تعمیرکاران، انعام‌ها، تنظیمات و سایر اطلاعات Workshop Manager در آن ذخیره می‌شوند. فاکتورهای FactorPlus علاوه بر IndexedDB، هنگام اجرای Windows در SQLite هم Sync می‌شوند تا در بکاپ دیتابیس قرار بگیرند.

## 4) بکاپ
پوشه بکاپ:
`Documents\Workshop Manager Backups`

بکاپ شامل SQLite و JSON است. بکاپ روزانه ساعت 23:55، بکاپ اضافه پنجشنبه ساعت 17:00 و بکاپ دستی در نظر گرفته شده است. Task Scheduler نیز در پروژه قرار دارد.

## 5) تست اجباری قبل از استفاده واقعی
- کارتکس بساز → برنامه را ببند → دوباره باز کن → کارتکس را بررسی کن.
- فاکتور ثبت کن → برنامه را ببند → دوباره باز کن → فاکتور را از «فاکتورهای ذخیره‌شده» باز کن.
- Backup دستی بگیر و فایل SQLite/JSON را جداگانه نگه دار.

تا وقتی این تست‌ها انجام نشده‌اند، EXE را نسخه کاری نهایی در نظر نگیرید.
