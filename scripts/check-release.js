const fetch = require('node-fetch');

async function checkRelease() {
  const releaseName = '2023.08.67';
  const response = await fetch(`https://api.github.com/repos/mintterteam/mintter/releases`);
  const releases = await response.json();

  const releaseExists = releases.some(release => release.name === releaseName);

  if (releaseExists) {
    console.error(`Release '${releaseName}' already exists.`);
    process.exit(1);
  } else {
    console.log(`Release '${releaseName}' does not exist.`);
  }
}

checkRelease();