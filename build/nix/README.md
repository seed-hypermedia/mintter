## Introduction

Nix has a steep learning curve, and it is weird in many places. But it eliminates a whole class of different problems, that no other tool is able to.

The UX of Nix is being improved with newer versions, and experimental Flakes feature. But it's currently not rolled out completely, and enabling it is not user-friendly at all :) So until Flakes is generally available, we'll use more proven old-school ways to deal with packages.

## How To Update Package

If you need to update some of the packages defined in our custom overlay, you can run the following:

```
nix-prefetch fetchFromGitHub --owner <owner> --repo <repo> --rev <commit>
```

This will fetch the repo from GitHub and will print the value of sha256 which you can use in the derivation.

You can use fetchers other than `fetchFromGitHub`, see the required flags using `nix-prefetch <fetcher> --help`.
