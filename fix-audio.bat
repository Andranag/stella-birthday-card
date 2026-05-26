@echo off
setlocal

:: Hardcoded FFmpeg path (update this if your install location changes)
set FFMPEG=C:\Users\andra\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe

:: Check if backup exists - if yes, restore first
if exist "public\assets\music-backup" (
  echo Restoring originals from backup...
  for %%f in ("public\assets\music-backup\*.mp3") do (
    copy /y "%%f" "public\assets\music\%%~nxf" >nul
  )
  echo Restored.
  echo.
)

echo Normalizing all audio files (gentle: preserves punch, fixes loudness)...
echo.

for %%f in ("public\assets\music\*.mp3") do (
  echo Processing: %%~nxf
  "%FFMPEG%" -y -i "%%f" -af "loudnorm=I=-14:TP=-1:LRA=11" -c:a libmp3lame -b:a 192k "%%f.temp.mp3" 2>nul
  if exist "%%f.temp.mp3" (
    move /y "%%f.temp.mp3" "%%f" >nul
    echo   OK
  ) else (
    echo   FAILED
  )
)

echo.
echo Done! All audio files normalized to -14 LUFS.
pause
