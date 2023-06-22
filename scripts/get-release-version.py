#!/usr/bin/env python3

# This script returns the identifier of a version
# which can be used to release the current state of the repository.
# We release for many different platforms, and we want to use the same version number for all of them.
# We want to use date-based versioning [calver] for simplicity, and because we don't have the notion of backward-compatibility,
# but due to the limitations of various ecosystems we are in (npm package versioning, Windows versioning [winver], etc.),
# we make sure that our version identifier is parsable and interpretable as a SemVer [semver] version.
# So, our version scheme is <year>.<month>.<build>, where:
#
#   <year> = the last 3 digits of the year of the commit being released, without leading 0.
#   <month> = the number of the month of the commit being released, without leading 0.
#   <build> = the ordinal number within year and month of the Git commit being released.
#
# [calver]: https://calver.org
# [winver]: https://learn.microsoft.com/en-us/windows/win32/msi/productversion
# [semver]: https://semver.org

import subprocess
import sys

WANT_BRANCH = "master"


def main():
    try:
        commit = sys.argv[1]
    except IndexError:
        commit = "HEAD"

    branch = (
        subprocess.run(
            "git branch --show-current", capture_output=True, shell=True, check=True
        )
        .stdout.decode()
        .strip()
    )

    if branch != WANT_BRANCH:
        print(
            "WARNING: Be careful using the result, because you are not on the master branch!",
            file=sys.stderr,
        )

    head_date = (
        subprocess.run(
            "git log -1 --format=%cd --date=format:'%Y-%m'",
            capture_output=True,
            shell=True,
            check=True,
        )
        .stdout.decode()
        .strip()
    )

    year, month = head_date.split("-")

    # Get the total number of commits made in the same year and month as the HEAD commit
    commit_count = (
        subprocess.run(
            f"git rev-list --count --since={year}-{month}-01 --before='{year}-{month}-31T23:59:59Z' {commit}",
            capture_output=True,
            shell=True,
            check=True,
        )
        .stdout.decode()
        .strip()
    )

    # Only using last 2 digits for year due to windows crap.
    version = f"{year[-3:].lstrip('0')}.{month.lstrip('0')}.{commit_count}"
    print(version)


if __name__ == "__main__":
    main()
