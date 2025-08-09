import fs         from 'fs-extra';
import os         from 'os';
import {execSync} from 'child_process';

// @ts-check

/** @implements {import('@playwright/test/reporter').Reporter} */
class SystemInfoReporter {
  onBegin(config, suite) {
    const systemInfo = this.getSystemInfo();

    // Store system info that can be accessed by other reporters
    process.env.PLAYWRIGHT_SYSTEM_INFO = JSON.stringify(systemInfo);

    console.log('\n=== System Information ===');
    console.log(`OS: ${systemInfo.os} ${systemInfo.osVersion}`);
    console.log(`Memory: ${systemInfo.totalMemory}GB`);
    console.log(`Node.js: ${systemInfo.nodeVersion}`);
    console.log(`Playwright: ${systemInfo.playwrightVersion}`);
    console.log('============================\n');
  }

  getSystemInfo() {
    let osVersion = os.release();

    // Get more detailed OS version
    try {
      if (process.platform === 'darwin') {
        osVersion = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      } else if (process.platform === 'linux') {
        const releaseInfo = execSync('cat /etc/os-release', { encoding: 'utf8' });
        const versionMatch = releaseInfo.match(/VERSION="([^"]+)"/);
        if (versionMatch) osVersion = versionMatch[1];
      } else if (process.platform === 'win32') {
        osVersion = execSync('ver', { encoding: 'utf8' }).trim();
      }
    } catch (e) {
      // Fallback to os.release()
    }

    return {
      os               : this.getOSName(),
      osVersion,
      totalMemory      : Math.round(os.totalmem() / (1024 ** 3)),
      nodeVersion      : process.version,
      playwrightVersion: fs.readJsonSync('./node_modules/@playwright/test/package.json').version,
      timestamp        : new Date().toISOString(),
      hostname         : os.hostname(),
      cpuCores         : os.cpus().length,
      platform         : process.platform,
      arch             : process.arch
    };
  }

  getOSName() {
    const platform = process.platform;
    switch (platform) {
      case 'darwin': return 'macOS';
      case 'win32': return 'Windows';
      case 'linux': return 'Linux';
      default: return platform;
    }
  }
}

export default SystemInfoReporter;
