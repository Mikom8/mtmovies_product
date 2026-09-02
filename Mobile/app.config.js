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

// Config plugin: Configures all projects with Kotlin resolution strategy, 
// disables AarMetadata tasks, and overrides compileSdk/targetSdk to 36.
const withAndroidProjectConfiguration = (config) => {
  const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('androidProjectConfigurationApplied')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /allprojects\s*\{/,
      `// androidProjectConfigurationApplied
allprojects {
  configurations.all {
    resolutionStrategy {
      force "org.jetbrains.kotlin:kotlin-stdlib:2.1.20"
      force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:2.1.20"
      force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:2.1.20"
    }
  }

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
  }`
    );
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    const hasProp = cfg.modResults.some(prop => prop.key === 'reactNativeArchitectures');
    if (!hasProp) {
      cfg.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a'
      });
    }
    // Upgrade KSP to match Kotlin 2.1.20 (required by expo-updates 29.x)
    const hasKsp = cfg.modResults.some(prop => prop.key === 'kotlin.ksp.version');
    if (!hasKsp) {
      cfg.modResults.push({
        type: 'property',
        key: 'kotlin.ksp.version',
        value: '2.1.20-1.0.32'
      });
    }
    return cfg;
  });

  return config;
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
      API_BASE_URL: process.env.API_BASE_URL || (process.env.EAS_BUILD === 'true' ? 'https://mtmovies-product-ea3t.onrender.com/api' : `http://${getLocalIp()}:5000/api`),
      eas: {
        projectId: "d60c5aaa-6677-4577-871a-6ca71484d824"
      }
    },
    plugins: [
      ...(config.plugins || []),
      "expo-font",
      "expo-video",
      "@react-native-google-signin/google-signin",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      withLocalProperties,
      withAndroidProjectConfiguration,
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.1.20",
            "compileSdkVersion": 36,
            "targetSdkVersion": 36
          }
        }
      ]
    ],

  };
};
