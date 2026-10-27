const { Setting } = require('../models');

async function updateAppReleaseSettings() {
  const settingsToUpdate = [
    { key: 'apkUrl', value: 'https://www.dholeraplatform.com/downloads/dholera.apk', category: 'app_release' },
    { key: 'latestBuildNumber', value: '6', category: 'app_release' },
    { key: 'requiredBuildNumber', value: '5', category: 'app_release' },
    { key: 'latestVersionName', value: '1.0.3', category: 'app_release' },
    { key: 'releaseNotes', value: 'Dholera SIR 2026 infrastructure maps, real-time breaking news sync, and in-app auto-update system.', category: 'app_release' },
    { key: 'updateTitle', value: 'New Update Available', category: 'app_release' },
    { key: 'updateMessage', value: 'A new version of Dholera Platform is available with the latest 2026 infrastructure data.', category: 'app_release' },
    { key: 'forceUpdate', value: 'false', category: 'app_release' }
  ];

  console.log('Updating app_release settings in database...');

  for (const item of settingsToUpdate) {
    const [setting, created] = await Setting.findOrCreate({
      where: { key: item.key },
      defaults: item
    });

    if (!created) {
      await setting.update({
        value: item.value,
        category: item.category
      });
      console.log(`Updated setting: ${item.key} = ${item.value}`);
    } else {
      console.log(`Created setting: ${item.key} = ${item.value}`);
    }
  }

  console.log('All app_release settings updated successfully.');
  process.exit(0);
}

updateAppReleaseSettings().catch(err => {
  console.error('Failed to update app release settings:', err);
  process.exit(1);
});
