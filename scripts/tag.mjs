import {execSync} from 'child_process'
let isDry = process.argv[2] == '--dry'

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
const newVersion = `${year}.${month}.${commitCount}`

if (isDry) {
  console.log(newVersion)
} else {
  pushTag(newVersion)
}


function pushTag(tagName) {
  try {
    // Step 1: Create a lightweight tag
    execSync(`git tag ${tagName}`);
  
    console.log('Tag created:', tagName);
  
    // Step 2: Push the tag to remote
    execSync(`git push origin ${tagName}`);
  
    console.log('Tag pushed:', tagName);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
