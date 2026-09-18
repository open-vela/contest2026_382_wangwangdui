@echo off
setlocal
chcp 65001 >nul

echo ========================================
echo   vela_band - quality check and build
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [vela_band] Node.js 18 or newer is required.
    exit /b 1
)

if not exist "node_modules\.bin\aiot.cmd" (
    echo [vela_band] Installing locked dependencies...
    echo.
    call npm ci
    if errorlevel 1 (
        echo [vela_band] npm ci failed
        exit /b 1
    )
    echo.
)

echo [vela_band] Running project checks...
call npm run check
if errorlevel 1 (
    echo [vela_band] Project checks FAILED
    exit /b 1
)

echo.
echo [vela_band] Building JSC-enabled RPK...
echo.
call npm run build
if errorlevel 1 (
    echo [vela_band] Build FAILED
    exit /b 1
)
echo.
echo ========================================
echo   vela_band - BUILD SUCCESS
echo ========================================
echo [vela_band] Output: dist\com.application.watch.demo.debug.1.0.0.rpk
exit /b 0
