@echo off
rem Fabrique l'APK d'Ardoise. Double-clic sur ce fichier, ou tape build-apk dans ce dossier.
rem Gradle a besoin de Java 17 ou 21 : on prend celui livré avec Android Studio s'il existe.
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
cd /d "%~dp0"
call npm install || goto :err
call npx cap sync android || goto :err
cd android
call gradlew.bat --stop >nul 2>&1
call gradlew.bat assembleRelease || goto :err
echo.
echo APK pret : %~dp0android\app\build\outputs\apk\release\app-release.apk
pause
exit /b 0
:err
echo.
echo La fabrication a echoue : envoie une capture de ce message.
pause
exit /b 1
