# Deploying the Agent to Other Systems

This guide explains how to set up the agent on a user's computer who is not the developer.

## 1. Prepare for Production

Before building the executable, you must ensure the agent points to your hosted backend (e.g., on Render).

1.  Open `agent/agent_config.env`.
2.  Update `TT_API_BASE` to your production URL:
    ```env
    TT_API_BASE=https://your-backend-name.onrender.com/api
    ```
3.  Ensure `TT_TOKEN` is empty (it will be populated on the user's machine after they log in).

## 2. Build the Executable

Run the build script to generate a fresh `agent.exe` with the production config:
```powershell
.\build_exe.ps1
```

## 3. Distribution

To set up the agent on another machine, you need to provide the following files from the `agent` directory:

1.  `dist/agent.exe`
2.  `agent_config.env`
3.  `local_keywords.json`

> [!IMPORTANT]
> Keep these three files in the **same folder** on the user's computer.

## 4. On the User's Machine

### Setup
1.  Create a folder for the application (e.g., `C:\Program Files\TimeFlow Agent` or `Documents\TimeFlow`).
2.  Paste the three files (`agent.exe`, `agent_config.env`, `local_keywords.json`) into that folder.

### First Run & Login
1.  Double-click `agent.exe`.
2.  The agent will detect it doesn't have a token and will prompt for login.
3.  Follow the prompts in the console window to enter the user's credentials.
4.  Once logged in, the agent will minimize to the system tray and start tracking.

### (Optional) Auto-Start on Boot
To make the agent start automatically when the user logs into Windows:
1.  Press `Win + R`, type `shell:startup`, and press Enter.
2.  Right-click `agent.exe` in its installation folder and select **Create Shortcut**.
3.  Move that shortcut into the **Startup** folder you just opened.

## Troubleshooting
- **Backend Connection**: If the agent fails to start, verify that the `TT_API_BASE` in `agent_config.env` is correct and accessible from the user's network.
- **Antivirus**: Some antivirus software may flag new executables. If so, add an exclusion for the agent's folder.
