# Lint status

`npm run lint` did not lint source. Expo found no ESLint configuration and attempted `npm install eslint@^9 eslint-config-expo@~57.0.2`; npm rejected that project-scoped install with `EALLOWSCRIPTS` because the repository's script policy requires explicit `allowScripts` configuration.

This is a tooling/dependency-policy blocker, not a reported source lint error. Least-privileged remediation: review the project npm policy with the repository owner, explicitly allow only the required package install scripts (or add reviewed ESLint dependencies/configuration through the normal dependency-change process), then rerun `npm run lint`. Lint remains unverified.
