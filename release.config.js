const base = require("semantic-release-npm-github-publish");

console.log(base);

module.exports = {
  ...base,
  releaseEvents: [],
  plugins: [
    ...base.plugins,
   [
     "@saithodev/semantic-release-backmerge",
     {
       "branches": [{"from": "master", "to": "beta"}]
     }
   ]
  ]
}