@echo off
setlocal

:: Get current date and time for backup folder name
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "year=%datetime:~0,4%"
set "month=%datetime:~4,2%"
set "day=%datetime:~6,2%"
set "hour=%datetime:~8,2%"
set "minute=%datetime:~10,2%"
set "second=%datetime:~12,2%"

set "backup_dir=..\_Backups\Backup_%year%-%month%-%day%_%hour%-%minute%-%second%"

echo Creating backup at: %backup_dir%
mkdir "%backup_dir%"

echo Copying Source Code...
xcopy "src" "%backup_dir%\src" /E /I /Y
xcopy "public" "%backup_dir%\public" /E /I /Y

echo Copying Configuration Files...
copy "package.json" "%backup_dir%\"
copy "tsconfig.json" "%backup_dir%\"
copy "next.config.ts" "%backup_dir%\"
copy "postcss.config.mjs" "%backup_dir%\"
copy "eslint.config.mjs" "%backup_dir%\"
copy "tailwind.config.ts" "%backup_dir%\" 2>nul
copy "README.md" "%backup_dir%\"

echo Copying Database...
copy "checklist.db" "%backup_dir%\"

echo.
echo Backup Completed Successfully!
echo Location: %backup_dir%
pause
