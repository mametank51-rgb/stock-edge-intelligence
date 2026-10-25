@echo off
cd /d "%~dp0"
set "STOCK_EDGE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%STOCK_EDGE_NODE%" (
  "%STOCK_EDGE_NODE%" server.cjs
) else (
  node server.cjs
)
pause
