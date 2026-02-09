@echo off
REM Build script to bundle Lambda functions with shared services

setlocal enabledelayedexpansion

set "PROJECT_ROOT=%~dp0.."
set "LAMBDA_SRC=%PROJECT_ROOT%\terraform\modules\lambda\src"
set "BACKEND_SRC=%PROJECT_ROOT%\backend\src"
set "BUILD_DIR=%PROJECT_ROOT%\terraform\modules\lambda\build"

echo Building Lambda functions with shared services...

REM Clean build directory
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"

REM List of Lambda functions
set FUNCTIONS=create-task get-tasks get-task update-task delete-task assign-task update-status get-users post-confirmation

for %%F in (%FUNCTIONS%) do (
    echo Building %%F...
    
    set "FUNC_BUILD_DIR=%BUILD_DIR%\%%F"
    mkdir "!FUNC_BUILD_DIR!"
    
    REM Copy handler
    copy "%LAMBDA_SRC%\%%F\index.js" "!FUNC_BUILD_DIR!\" >nul
    
    REM Copy shared services
    mkdir "!FUNC_BUILD_DIR!\backend\src"
    xcopy "%BACKEND_SRC%\services" "!FUNC_BUILD_DIR!\backend\src\services\" /E /I /Q >nul
    xcopy "%BACKEND_SRC%\utils" "!FUNC_BUILD_DIR!\backend\src\utils\" /E /I /Q >nul
    
    echo %%F built successfully
)

echo All Lambda functions built successfully!
echo Build output: %BUILD_DIR%

endlocal
