: << 'CMDBLOCK'
@echo off
REM Cross-platform polyglot wrapper for hook scripts.
REM On Windows: cmd.exe runs the batch portion, which finds and calls bash.
REM On Unix: the shell interprets this as a script (: is a no-op in bash).
REM
REM Hook scripts use extensionless filenames (e.g. "session-start" not
REM "session-start.sh") so Claude Code's Windows auto-detection -- which
REM prepends "bash" to any command containing .sh -- doesn't interfere.
REM
REM Usage: run-hook.cmd <script-name> [args...]
REM
REM bash discovery order (Windows):
REM   1. %CLAUDE_CODE_GIT_BASH_PATH%  -- Claude Code's own variable on Windows
REM   2. %SUPERPOWERS_BASH%           -- explicit override for this plugin
REM   3. standard Git for Windows locations (machine-wide and per-user)
REM   4. derived from `where git`     -- covers Git installed anywhere else
REM   5. bash on PATH, skipping the WSL launchers (System32 and the WindowsApps
REM      alias): they cannot execute Windows paths like C:\..., so silently
REM      falling back to them breaks SessionStart injection with no error.

if "%~1"=="" (
    echo run-hook.cmd: missing script name >&2
    exit /b 1
)

set "HOOK_DIR=%~dp0"
set "BASH_EXE="

if not defined BASH_EXE if defined CLAUDE_CODE_GIT_BASH_PATH if exist "%CLAUDE_CODE_GIT_BASH_PATH%" set "BASH_EXE=%CLAUDE_CODE_GIT_BASH_PATH%"
if not defined BASH_EXE if defined SUPERPOWERS_BASH if exist "%SUPERPOWERS_BASH%" set "BASH_EXE=%SUPERPOWERS_BASH%"
if not defined BASH_EXE if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "BASH_EXE=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"

REM Ask git where it lives, then look for bash next to it (any install location)
if not defined BASH_EXE (
    for /f "delims=" %%G in ('where git 2^>nul') do (
        if not defined BASH_EXE (
            for %%D in ("%%~dpG..") do (
                if exist "%%~fD\bin\bash.exe" set "BASH_EXE=%%~fD\bin\bash.exe"
                if not defined BASH_EXE if exist "%%~fD\usr\bin\bash.exe" set "BASH_EXE=%%~fD\usr\bin\bash.exe"
            )
        )
    )
)

if not defined BASH_EXE (
    for /f "delims=" %%B in ('where bash 2^>nul') do (
        if not defined BASH_EXE (
            echo %%B | findstr /i /c:"system32" /c:"windowsapps" >nul
            if errorlevel 1 set "BASH_EXE=%%B"
        )
    )
)

if not defined BASH_EXE (
    echo run-hook.cmd: no usable bash found - set CLAUDE_CODE_GIT_BASH_PATH or SUPERPOWERS_BASH to your Git Bash ^(e.g. C:\Program Files\Git\bin\bash.exe^) >&2
    REM Exit 0 anyway so the session still starts; the line above says why the
    REM SessionStart context was not injected.
    exit /b 0
)

"%BASH_EXE%" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
exit /b %ERRORLEVEL%
CMDBLOCK

# Unix: run the named script directly
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_NAME="$1"
shift
exec bash "${SCRIPT_DIR}/${SCRIPT_NAME}" "$@"
