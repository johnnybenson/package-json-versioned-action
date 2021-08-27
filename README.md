# Github Action : Did my package.json version just update? Ok Cool, what is it?

## Usage:

Could be cool to use this to auto-tag the current sha and trigger automated deployment.

```
name: Check package.json

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  check-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: ./
        id: package-json
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: echo "has-updated -- ${{ steps.package-json.outputs.has-updated }}"
      - run: echo "version -- ${{ steps.package-json.outputs.version }}"

```
