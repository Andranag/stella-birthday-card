@echo off
setlocal enabledelayedexpansion

:: Hardcoded FFmpeg path
set FFMPEG=C:\Users\andra\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe

set TRACKER=.audio-fixed.txt
set NEWCOUNT=0

:: Build list of already-fixed files
set FIXEDFILES=
if exist "%TRACKER%" (
  for /f "delims=" %%a in (%TRACKER%) do set FIXEDFILES=!FIXEDFILES! %%a
)

echo Checking for new audio files...
echo.

for %%f in ("public\assets\music\*.mp3") do (
  set "FILENAME=%%~nxf"
  set "ISFIXED=!FIXEDFILES: %%~nxf =!"
  
  if "!ISFIXED!"=="!FIXEDFILES!" (
    echo New file found: %%~nxf
    "%FFMPEG%" -y -i "%%f" -af "loudnorm=I=-14:TP=-1:LRA=11" -c:a libmp3lame -b:a 192k "%%f.temp.mp3" 2>nul
    if exist "%%f.temp.mp3" (
      move /y "%%f.temp.mp3" "%%f" >nul
      echo %%~nxf >> "%TRACKER%"
      set /a NEWCOUNT+=1
      echo   Fixed
    ) else (
      echo   FAILED
    )
    echo.
  )
)

if %NEWCOUNT%==0 (
  echo No new files to process.
) else (
  echo.
  echo Done! Fixed %NEWCOUNT% new file(s).
)
pause
