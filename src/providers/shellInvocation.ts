import * as os from 'os';

export interface ShellInvocation {
  shell: string;
  args: string[];
}

export function isWindowsPlatform(platform = os.platform()): boolean {
  return platform === 'win32';
}

function isLoginShellCompatible(shell: string): boolean {
  const normalized = shell.toLowerCase();
  return normalized.endsWith('/bash') || normalized.endsWith('/zsh') || normalized.endsWith('\\bash.exe') || normalized.endsWith('\\zsh.exe');
}

export function buildShellInvocation(command: string, options: { platform?: NodeJS.Platform; shell?: string; comSpec?: string } = {}): ShellInvocation {
  const platform = options.platform ?? os.platform();

  if (isWindowsPlatform(platform)) {
    const shell = options.shell || options.comSpec || process.env.ComSpec || 'cmd.exe';
    return {
      shell,
      args: ['/d', '/s', '/c', command]
    };
  }

  const shell = options.shell || process.env.SHELL || '/bin/sh';
  return {
    shell,
    args: [isLoginShellCompatible(shell) ? '-lc' : '-c', command]
  };
}

export function quoteForPosixShell(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
