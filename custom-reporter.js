import fs from 'fs-extra';
import os from 'os';
import { execSync } from 'child_process';

class BenchmarkSystemReporter {
  onBegin(config, suite) {
    const systemInfo = this.getSystemInfo();
    const browserInfo = this.getBrowserInfo();

    // Store comprehensive system info
    const fullSystemInfo = {
      ...systemInfo,
      browsers: browserInfo,
      benchmarkRun: {
        timestamp: new Date().toISOString(),
        playwrightProjects: config.projects?.map(p => p.name) || [],
        totalTests: suite.allTests().length
      }
    };

    // Write detailed system info to file for benchmark results
    fs.writeJsonSync('benchmark-system-info.json', fullSystemInfo, { spaces: 2 });

    // Enhanced console output for benchmarks
    console.log('\n' + '='.repeat(50));
    console.log('🚀 BENCHMARK SYSTEM INFORMATION');
    console.log('='.repeat(50));
    console.log(`🖥️  OS: ${systemInfo.os} ${systemInfo.osVersion} (${systemInfo.arch})`);
    console.log(`💾 RAM: ${systemInfo.totalMemory}GB (Available: ${systemInfo.freeMemory}GB)`);
    console.log(`⚡ CPU: ${systemInfo.cpuModel} (${systemInfo.cpuCores} cores @ ${systemInfo.cpuSpeed}GHz)`);
    console.log(`📦 Node.js: ${systemInfo.nodeVersion}`);
    console.log(`🎭 Playwright: ${systemInfo.playwrightVersion}`);

    if (browserInfo.chrome) console.log(`🌐 Chrome: ${browserInfo.chrome}`);
    if (browserInfo.firefox) console.log(`🦊 Firefox: ${browserInfo.firefox}`);
    if (browserInfo.safari) console.log(`🧭 Safari: ${browserInfo.safari}`);

    console.log(`🏃 Running ${suite.allTests().length} tests across ${config.projects?.length || 1} browsers`);
    console.log('='.repeat(50) + '\n');
  }

  getSystemInfo() {
    let osVersion = os.release();
    let cpuModel = 'Unknown';
    let cpuSpeed = 'Unknown';

    // Get more detailed system info
    try {
      if (process.platform === 'darwin') {
        osVersion = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
        cpuModel = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim();
        cpuSpeed = execSync('sysctl -n hw.cpufrequency_max', { encoding: 'utf8' }).trim();
        cpuSpeed = cpuSpeed ? (parseInt(cpuSpeed) / 1000000000).toFixed(1) : 'Unknown';
      } else if (process.platform === 'linux') {
        const releaseInfo = execSync('cat /etc/os-release', { encoding: 'utf8' });
        const versionMatch = releaseInfo.match(/VERSION="([^"]+)"/);
        if (versionMatch) osVersion = versionMatch[1];

        const cpuInfo = execSync('cat /proc/cpuinfo | grep "model name" | head -1', { encoding: 'utf8' });
        const cpuMatch = cpuInfo.match(/model name\s*:\s*(.+)/);
        if (cpuMatch) cpuModel = cpuMatch[1].trim();
      } else if (process.platform === 'win32') {
        osVersion = execSync('ver', { encoding: 'utf8' }).trim();
        cpuModel = execSync('wmic cpu get name /value | findstr Name=', { encoding: 'utf8' }).replace('Name=', '').trim();
      }
    } catch (e) {
      // Fallback to basic info
    }

    return {
      os: this.getOSName(),
      osVersion,
      arch: process.arch,
      platform: process.platform,
      totalMemory: Math.round(os.totalmem() / (1024 ** 3)),
      freeMemory: Math.round(os.freemem() / (1024 ** 3)),
      cpuCores: os.cpus().length,
      cpuModel,
      cpuSpeed,
      nodeVersion: process.version,
      playwrightVersion: fs.readJsonSync('./node_modules/@playwright/test/package.json', 'utf8').version,
      timestamp: new Date().toISOString(),
      loadAverage: os.loadavg(),
      uptime: Math.round(os.uptime() / 3600), // hours
    };
  }

  getBrowserInfo() {
    const browsers = {};

    try {
      // Chrome version
      if (process.platform === 'darwin') {
        browsers.chrome = execSync('"/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" --version 2>/dev/null || echo "Not found"', { encoding: 'utf8' }).trim();
      } else if (process.platform === 'linux') {
        browsers.chrome = execSync('google-chrome --version 2>/dev/null || chromium-browser --version 2>/dev/null || echo "Not found"', { encoding: 'utf8' }).trim();
      } else if (process.platform === 'win32') {
        browsers.chrome = execSync('reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v version 2>nul || echo "Not found"', { encoding: 'utf8' }).trim();
      }

      // Firefox version
      if (process.platform === 'darwin') {
        browsers.firefox = execSync('/Applications/Firefox.app/Contents/MacOS/firefox --version 2>/dev/null || echo "Not found"', { encoding: 'utf8' }).trim();
      } else if (process.platform === 'linux') {
        browsers.firefox = execSync('firefox --version 2>/dev/null || echo "Not found"', { encoding: 'utf8' }).trim();
      } else if (process.platform === 'win32') {
        browsers.firefox = execSync('firefox --version 2>nul || echo "Not found"', { encoding: 'utf8' }).trim();
      }

      // Safari (macOS only)
      if (process.platform === 'darwin') {
        browsers.safari = execSync('mdls -name kMDItemVersion /Applications/Safari.app 2>/dev/null || echo "Not found"', { encoding: 'utf8' }).trim();
        if (browsers.safari !== 'Not found') {
          browsers.safari = `Safari ${browsers.safari}`;
        }
      }
    } catch (e) {
      // Fallback - some browsers might not be installed
    }

    return browsers;
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

  onEnd(result) {
    const duration = result.duration || 0;
    console.log(`\n Benchmark completed in ${Math.round(duration / 1000)}s`);
    console.log(`✅ Passed: ${result.stats?.passed || 0}`);
    console.log(`❌ Failed: ${result.stats?.failed || 0}`);
    console.log(`⏭️  Skipped: ${result.stats?.skipped || 0}`);
  }
}

export default BenchmarkSystemReporter;
