# Code Time Tracker

<div align="center">

A VS Code/Cursor extension for tracking time spent coding with GitHub authentication and Supabase backend.

[![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Commands](#-commands)
- [Architecture](#-architecture)
- [Development](#-development)
- [Team Distribution](#-team-distribution)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## 🎯 About

Code Time Tracker is a VS Code extension that automatically tracks the time you spend coding. It integrates with GitHub for authentication and uses Supabase as a backend to store time tracking data, making it perfect for teams who want to track coding time across projects.

### ✅ Editor Compatibility

- **VS Code**: Fully supported ✅
- **Cursor IDE**: Fully supported ✅

The extension uses standard VS Code Extension API, ensuring compatibility across all VS Code-based editors.

### Key Highlights

- **Automatic Tracking**: Starts tracking when you begin coding, no manual intervention needed
- **Team Collaboration**: Share time tracking data with your team through Supabase
- **GitHub Integration**: Seamless authentication using your GitHub account
- **Smart Idle Detection**: Automatically pauses tracking when you're inactive
- **Session Recovery**: Recovers active sessions after VS Code restarts
- **Workspace Awareness**: Tracks time per workspace/project

## ✨ Features

### Core Features

- ✅ **GitHub Authentication** - Secure login using VS Code's built-in GitHub authentication
- ✅ **Automatic Time Tracking** - Tracks coding activity based on editor interactions
- ✅ **Smart Idle Detection** - Configurable timeout to pause tracking during inactivity
- ✅ **Session Recovery** - Automatically recovers active sessions after VS Code restarts
- ✅ **Status Bar Integration** - Quick access to start/stop tracking and view elapsed time
- ✅ **Dashboard View** - Visual dashboard showing time tracking statistics
- ✅ **Workspace-Based Tracking** - Tracks time per workspace/project
- ✅ **Offline Support** - Continues tracking during connectivity issues

### Technical Features

- **Supabase Backend** - Scalable PostgreSQL database with Row Level Security
- **Real-time Updates** - Status bar updates every second during active tracking
- **Error Handling** - Comprehensive error handling with user-friendly messages
- **Configuration Validation** - Validates settings before starting tracking

## 📦 Prerequisites

Before installing Code Time Tracker, ensure you have:

1. **VS Code or Cursor IDE** version 1.100.0 or higher
   - **VS Code**: Download from [code.visualstudio.com](https://code.visualstudio.com/)
   - **Cursor**: Download from [cursor.com](https://cursor.com)
   - ✅ **Fully compatible with both editors!**

2. **Supabase Account** (free tier works)
   - Sign up at [supabase.com](https://supabase.com)

3. **GitHub Account**
   - For authentication (any GitHub account works)

4. **Node.js** (for development only)
   - Version 18.x or higher
   - Required only if you plan to build from source

## 🚀 Installation

### ✅ Compatible with VS Code and Cursor IDE

This extension works seamlessly in both **VS Code** and **Cursor IDE**! Choose your editor and follow the instructions below.

### Option 1: Install from VSIX (Works in Both Editors)

**For VS Code:**
1. Download the `.vsix` file from the [Releases](https://github.com/yourusername/code-time-tracker/releases) page
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the `...` menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file

**For Cursor:**
1. Download the `.vsix` file from the [Releases](https://github.com/yourusername/code-time-tracker/releases) page
2. Open Cursor
3. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the `...` menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file

### Option 2: Import from VS Code (Cursor Only)

If you already have the extension installed in VS Code, you can import it to Cursor:

1. Open Cursor Settings (`Ctrl+Shift+J` or `Cmd+Shift+J`)
2. Navigate to **General** → **Account**
3. Under **VS Code Import**, click **Import**
4. This will transfer your extensions, settings, and keybindings from VS Code to Cursor

### Option 3: Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/code-time-tracker.git
cd code-time-tracker

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

## ⚙️ Configuration

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned (takes ~2 minutes)

### Step 2: Set Up Database Schema

Run the SQL migration to create the necessary tables:

**Option A: Using Supabase Dashboard (Recommended)**

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Click **Run** to execute the migration
6. Verify tables were created in **Table Editor**

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

> **Note**: You can find your project ref in the Supabase dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`

### Step 3: Configure Editor Settings

**For VS Code:**
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Time Tracker"
3. Configure the following settings:

**For Cursor:**
1. Open Cursor Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Time Tracker"
3. Configure the following settings:

| Setting | Description | Where to Find |
|---------|-------------|---------------|
| `timeTracker.supabaseUrl` | Your Supabase project URL (required) | Supabase Dashboard → Settings → API → Project URL |
| `timeTracker.supabaseKey` | Your Supabase API key (required) | Supabase Dashboard → Settings → API → Project API keys → **anon** key |
| `timeTracker.idleTimeoutMinutes` | Minutes of inactivity before stopping (optional) | Default: 5 minutes |

**Example Configuration:**

```json
{
  "timeTracker.supabaseUrl": "https://your-project.supabase.co",
  "timeTracker.supabaseKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "timeTracker.idleTimeoutMinutes": 5
}
```

> ⚠️ **Important**: Never commit your Supabase credentials to version control. These settings are stored locally in VS Code settings.

## 📖 Usage

### Getting Started

1. **Login with GitHub**
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Run: `Time Tracker: Login with GitHub`
   - Authorize the extension in the browser
   - Tracking will start automatically after login

2. **Start/Stop Tracking**
   - **Start**: Click the status bar item or run `Time Tracker: Start Tracking`
   - **Stop**: Click the status bar item or run `Time Tracker: Stop Tracking`
   - The status bar shows elapsed time: `🕐 01:23:45`

3. **View Dashboard**
   - Click the Time Tracker icon in the Activity Bar
   - Or run: `Time Tracker: Show Dashboard`

### Status Bar

The status bar shows:
- **When not tracking**: `▶ Start Tracking`
- **When tracking**: `🕐 01:23:45` (updates every second)

Click the status bar item to start/stop tracking or view the dashboard.

### Automatic Features

- **Auto-start**: Tracking starts automatically after GitHub login
- **Idle detection**: Automatically stops tracking after the configured idle timeout
- **Session recovery**: Active sessions are recovered when VS Code restarts

## ⌨️ Commands

All commands are accessible via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `Time Tracker: Login with GitHub` | Authenticate with GitHub |
| `Time Tracker: Start Tracking` | Start a new tracking session |
| `Time Tracker: Stop Tracking` | Stop the current tracking session |
| `Time Tracker: Show Dashboard` | Open the time tracking dashboard |

## 🏗️ Architecture

### Project Structure

```
code-time-tracker/
├── src/
│   ├── config/
│   │   ├── settings.ts          # Configuration management
│   │   └── supabase.ts          # Supabase client initialization
│   ├── services/
│   │   ├── authentication.ts    # GitHub authentication
│   │   └── timeTracking.ts     # Core time tracking logic
│   ├── webviews/
│   │   └── dashboard.ts        # Dashboard webview
│   ├── extension.ts             # Extension entry point
│   └── test/                    # Test files
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── package.json
└── README.md
```

### Database Schema

The extension uses two main tables:

- **`users`**: Stores GitHub user information
  - `id` (UUID, primary key)
  - `github_id` (TEXT, unique)
  - `username` (TEXT)
  - `created_at` (TIMESTAMP)

- **`time_entries`**: Stores time tracking entries
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key)
  - `start_time` (TIMESTAMP)
  - `end_time` (TIMESTAMP)
  - `workspace_name` (TEXT)
  - `is_active` (BOOLEAN)
  - `last_active` (TIMESTAMP)
  - `stop_reason` (TEXT)
  - `created_at` (TIMESTAMP)

### Technology Stack

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: GitHub OAuth via VS Code
- **Testing**: Mocha, Sinon

## 🛠️ Development

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- VS Code 1.100.0 or higher

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/code-time-tracker.git
cd code-time-tracker

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes (in a separate terminal)
npm run watch
```

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run with coverage
npm run test:coverage
```

### Debugging

1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. The extension will be loaded in the new window
4. Use the Debug Console to see logs
5. Set breakpoints in TypeScript files

### Building

```bash
# Compile TypeScript
npm run compile

# Package extension (creates .vsix file)
npm run package
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [VS Code](https://code.visualstudio.com/) for the extensibility platform
- All contributors who help improve this project

---

<div align="center">

**Made with ❤️ for developers**


</div>
