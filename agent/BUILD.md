# Building Agent Executable

This guide explains how to create a standalone Windows executable (`.exe`) for the agent.

## Prerequisites

1.  **Python 3.x**: Ensure Python is installed and added to your PATH.
2.  **PyInstaller**: The tool used to package Python applications.
3.  **Requirements**: All dependencies listed in `requirements.txt`.

## Build Steps

### Manual Build

1.  Open a terminal (PowerShell or Command Prompt) in the `agent` directory.
2.  (Optional but recommended) Create and activate a virtual environment:
    ```powershell
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```
3.  Install dependencies:
    ```powershell
    pip install -r requirements.txt
    pip install pyinstaller
    ```
4.  Run the build command using the provided `.spec` file:
    ```powershell
    pyinstaller agent.spec --clean
    ```

### Automated Build

A PowerShell script `build_exe.ps1` is provided to automate the process.

1.  Right-click `build_exe.ps1` and select **Run with PowerShell**, or run it from a terminal:
    ```powershell
    .\build_exe.ps1
    ```

## Output

The generated executable will be located in the `agent/dist/` directory as `agent.exe`.
