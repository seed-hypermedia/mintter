import {execSync} from 'child_process'

// Get the current year and month
const currentDate = new Date()
const year = currentDate.getFullYear()
const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
const nextMonth = (currentDate.getMonth() + 2).toString().padStart(2, '0')

// Get the number of commits in the current month
const commitCount = execSync(
  `git log --since="${year}-${month}-01" --until="${year}-${nextMonth}-01" --oneline | wc -l`,
)
  .toString()
  .trim().padStart(2, '0')

// Construct the new version string
const newVersion = `v${year}.${month}.${commitCount}`

// // Read the package.json file
// const packageJsonPath = './frontend/apps/desktop/package.json'
// const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// // Update the version attribute
// packageJson.version = newVersion
// let orderedResult = sortPackageJson(packageJson, {
//   sortOrder: ['name', 'version', 'productName']
// })
// // Write the updated package.json back to the file
// fs.writeFileSync(packageJsonPath, JSON.stringify(orderedResult, null, 2))

console.log(newVersion)
