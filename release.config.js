const base = require("semantic-release-npm-github-publish");

module.exports = {
  ...base,
  branches: ['+([0-9])?(.{+([0-9]),x}).x', 'master', {name: 'next', prerelease: true}, {name: 'beta', prerelease: true}, {name: 'alpha', prerelease: true}],
  releaseRules: [],
  plugins: [
    ...base.plugins.slice(1),
   [
     "@saithodev/semantic-release-backmerge",
     {
       "branches": [{"from": "master", "to": "beta"}]
     }
   ]
  ]
}