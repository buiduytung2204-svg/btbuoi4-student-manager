const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
// Expo locales localizes iOS metadata; Android launcher names need resources.
module.exports = config => withDangerousMod(config, ['android', async config => {
  for (const [locale, name] of Object.entries({ vi: 'Quản lý sinh viên', en: 'Student Manager' })) {
    const directory = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res', `values-${locale}`);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'localized_name.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources><string name="app_name">${name}</string></resources>\n`, 'utf8');
  }
  return config;
}]);
