# Deployment Targets

## Current remotes

- `origin`: `https://github.com/jjjjjjisong/dknh-sys.git`
- `dev-origin`: `https://github.com/jjjjjjisong/dknh-sys-dev.git`

## Intended usage

- Production deployment uses `origin`
- Development deployment uses `dev-origin`

## Branch notes

- `origin/main` should be treated as the production line
- `dev-origin/main` should be treated as the development deployment line
- `origin/dev` can exist as a working branch, but it is not the development server deployment target by itself

## GitHub Pages

- GitHub Pages workflow in this repository should run from `main` only
- Do not use the Pages workflow as the deployment path for the development server

## Practical push examples

Production release:

```bash
git checkout main
git push origin main
```

Development release from the current branch tip:

```bash
git push dev-origin HEAD:main
```
