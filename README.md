Geo Construction App
====================

Docker image (GHCR)
- Image is published to GitHub Container Registry (GHCR): `ghcr.io/atkinart/gera-ui`
- On pushes to `main`/`master` → tags `latest` and full commit SHA
- On tag pushes (e.g. `v1.2.3`) → tags `v1.2.3` and `latest`

Pull and Run
- Pull latest: `docker pull ghcr.io/atkinart/gera-ui:latest`
- Run: `docker run --rm -p 8080:80 ghcr.io/atkinart/gera-ui:latest`
- Then open http://localhost:8080

Using a specific version
- Pull a tag: `docker pull ghcr.io/atkinart/gera-ui:v1.2.3`
- Run: `docker run --rm -p 8080:80 ghcr.io/atkinart/gera-ui:v1.2.3`

Authentication notes
- If the repository/package is private, authenticate first:
  - `echo $GITHUB_TOKEN | docker login ghcr.io -u <YOUR_GH_USERNAME> --password-stdin`
  - Token must have `read:packages` scope
  - Alternatively, make the GHCR package public in repository settings

CI Overview
- GitHub Actions workflow at `.github/workflows/ci.yml` runs lint, tests, and builds Docker images
- Images are built with the project `Dockerfile` and served via Nginx on port 80
# gera-ui
