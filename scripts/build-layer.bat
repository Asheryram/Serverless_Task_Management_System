@echo off
REM Build Lambda Layer with shared services

setlocal enabledelayedexpansion

set "PROJECT_ROOT=%~dp0.."
set "BACKEND_SRC=%PROJECT_ROOT%\backend\src"
set "LAYER_DIR=%PROJECT_ROOT%\terraform\modules\lambda\layer\nodejs\node_modules\shared"

echo Building Lambda Layer...

REM Clean and create layer directory
if exist "%PROJECT_ROOT%\terraform\modules\lambda\layer" rmdir /s /q "%PROJECT_ROOT%\terraform\modules\lambda\layer"
mkdir "%LAYER_DIR%"

REM Copy services
xcopy "%BACKEND_SRC%\services" "%LAYER_DIR%\services\" /E /I /Q
echo Services copied

REM Copy utils
xcopy "%BACKEND_SRC%\utils" "%LAYER_DIR%\utils\" /E /I /Q
echo Utils copied

REM Create package.json for layer
(
echo {
echo   "name": "shared-services-layer",
echo   "version": "1.0.0",
echo   "description": "Shared services for Lambda functions",
echo   "dependencies": {
echo     "@aws-sdk/client-dynamodb": "^3.400.0",
echo     "@aws-sdk/lib-dynamodb": "^3.400.0",
echo     "@aws-sdk/client-ses": "^3.400.0",
echo     "@aws-sdk/client-cognito-identity-provider": "^3.400.0",
echo     "uuid": "^9.0.0"
echo   }
echo }
) > "%PROJECT_ROOT%\terraform\modules\lambda\layer\nodejs\package.json"

echo Layer structure created successfully!
echo Location: %LAYER_DIR%

endlocal
