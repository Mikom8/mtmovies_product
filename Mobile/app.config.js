const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Config plugin: writes local.properties with sdk.dir so it survives every prebuild
const withLocalProperties = (config) => {
  const { withDangerousMod } = require('@expo/config-plugins');
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      if (process.platform === 'win32' && process.env.EAS_BUILD !== 'true') {
        const localPropsPath = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
        const sdkPath = 'C:\\\\Users\\\\hp\\\\AppData\\\\Local\\\\Android\\\\Sdk';
        fs.writeFileSync(localPropsPath, `sdk.dir=${sdkPath}\n`, 'utf8');
      }
      return cfg;
    },
  ]);
};

// Config plugin: forces Kotlin stdlib to 2.0.21 so incompatible transitive deps are downgrade-resolved.
const withKotlinResolutionStrategy = (config) => {
  const { withProjectBuildGradle } = require('@expo/config-plugins');
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('kotlin-stdlib:2.0.21')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      `allprojects {
  configurations.all {
    resolutionStrategy {
      force "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"
      force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:2.0.21"
      force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:2.0.21"
    }
  }
  repositories {`
    );
    return cfg;
  });
};

// Config plugin: forces ALL subprojects (including third-party libs like google-signin)
// to use compileSdk 36. EAS installs android-37 as android-37.0 (preview SDK naming),
// so any request for android-37 hash fails. Keeping at 36 avoids this entirely.
const withCompileSdkOverride = (config) => {
  const { withProjectBuildGradle } = require('@expo/config-plugins');
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('compileSdkOverrideApplied')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /allprojects\s*\{/,
      `// compileSdkOverrideApplied
allprojects {
  // Disable AAR metadata checks so StartApp SDK doesn't complain about compileSdk 36
  tasks.whenTaskAdded { task ->
    if (task.name.contains("AarMetadata")) {
      task.enabled = false
    }
  }

  // Force all modules to use compileSdk 36 to avoid android-37 hash resolution issue on EAS
  afterEvaluate {
    if (project.hasProperty('android')) {
      android {
        compileSdkVersion 36
        if (defaultConfig) {
          defaultConfig.targetSdkVersion = 36
        }
      }
    }
  }`,
    );
    return cfg;
  });
};

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_GOOGLE_CLIENT_ID: process.env.EXPO_GOOGLE_CLIENT_ID || '',
      IOS_GOOGLE_CLIENT_ID: process.env.IOS_GOOGLE_CLIENT_ID || '',
      ANDROID_GOOGLE_CLIENT_ID: process.env.ANDROID_GOOGLE_CLIENT_ID || '',
      WEB_GOOGLE_CLIENT_ID: process.env.WEB_GOOGLE_CLIENT_ID || '',
      API_BASE_URL: process.env.API_BASE_URL || (process.env.EAS_BUILD === 'true' ? 'https://mtmoviesproduct-production.up.railway.app/api' : `http://${getLocalIp()}:5000/api`),
      eas: {
        projectId: "fdadf6fd-60cc-49ca-9408-78d4ca38bede"
      }
    },
    plugins: [
      ...(config.plugins || []),
      "expo-font",
      "expo-video",
      "@react-native-google-signin/google-signin",
      withLocalProperties,
      withKotlinResolutionStrategy,
      withCompileSdkOverride,
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.0.21",
            "compileSdkVersion": 36,
            "targetSdkVersion": 36
          }
        }
      ]
    ],

  };
};
