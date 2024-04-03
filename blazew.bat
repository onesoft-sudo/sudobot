@rem This is the BlazeBuild wrapper script for Windows.
@echo off
setlocal

set VERSION=1.0.0-alpha.1

set "argv_0=%~dpnx0"
set "projectdir=%~dp0"

call :startup

:parse_args
set "setup=0"
set "argsetup=0"

for %%i in (%*) do (
    if "%%i"=="--setup" (
        set "setup=1"
        set "argsetup=1"
    ) else if "%%i"=="--help" (
        call :help
    ) else if "%%i"=="--version" (
        call :version
    )
)

if not exist "%projectdir%.blaze\build.d.ts" (
    call :create_build_d_ts
)

if not exist "%projectdir%build_src\node_modules" (
    set "setup=1"
) else if not exist "%projectdir%node_modules\blazebuild" (
    set "setup=1"
)

if not "%setup%"=="0" (
    call :setup
)

if "%argsetup%"=="1" (
    exit /b 0
)

call :blaze_cmd %*

exit /b 0

:startup
echo BlazeBuild Wrapper version %VERSION%
echo.
exit /b

:print
echo %1   %2
exit /b

:help
call :startup
echo Usage: %argv_0% [options] [tasks...]
echo Options:
echo   --setup   Setup BlazeBuild
echo   --help    Show this help message
echo   --version Show the version of BlazeBuild
echo Tasks:
echo   Any arguments or task names that should
echo   be passed to BlazeBuild.
echo   Run `%argv_0% tasks' to see a list of
echo   available tasks.
exit /b 0

:version
call :startup
exit /b 0

:create_build_d_ts
call :print "info   " "Creating %projectdir%.blaze\build.d.ts..."
mkdir "%projectdir%.blaze" >nul 2>&1
copy "%projectdir%build_src\templates\build.d.ts" "%projectdir%.blaze\build.d.ts" >nul 2>&1

if errorlevel 1 (
    call :print "error  " "Failed to create build.d.ts."
    exit /b 1
)
exit /b

:setup
call :startup
call :print "info   " "Project directory: %projectdir%"
call :print "info   " "Setting up BlazeBuild..."
rd /s /q "%projectdir%build_src\node_modules" >nul 2>&1
pushd "%projectdir%build_src" >nul 2>&1

call :print "info   " "Installing dependencies for BlazeBuild..."
call :print "command" "npm install"
npm install >nul 2>&1
popd >nul 2>&1

call :print "info   " "Finishing up..."
mkdir "%projectdir%node_modules" >nul 2>&1

if not exist "%projectdir%node_modules\blazebuild" (
    mklink /j "%projectdir%node_modules\blazebuild" "%projectdir%build_src" >nul 2>&1
)

if not exist "%projectdir%node_modules\blazebuild" (
    call :print "error  " "Failed to create symbolic link."
    exit /b 1
)

if "%cmd%"=="" (
    call :print "info   " "Building BlazeBuild (for node)..."
    pushd "%projectdir%build_src" >nul 2>&1
    npx tsc >nul 2>&1
    popd >nul 2>&1
)
call :print "success" "Setup completed."
exit /b

:blaze_cmd
if "%cmd%"=="" (
    node "%projectdir%build_src\build\index.js" %*
) else (
    bun "%projectdir%build_src\src\index.ts" %*
)
exit /b
