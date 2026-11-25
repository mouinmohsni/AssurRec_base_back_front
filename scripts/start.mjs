// Compatible PowerShell, cmd.exe, bash et zsh.
process.env.NODE_ENV = "production";
await import("../dist/server.js");
