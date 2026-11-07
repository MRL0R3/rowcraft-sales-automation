# Publication and GitHub Pages

The repository is prepared for GitHub Pages project hosting at the expected URL `https://mrl0r3.github.io/rowcraft-sales-automation/` if the repository owner and name match. This URL is planned and has not been published or verified. The Vite build uses relative `./assets/...` URLs, which work for both the local preview and GitHub Pages project subpaths. The Pages workflow injects the actual repository URL into the source link at build time.

1. Create `mrl0r3/rowcraft-sales-automation` on GitHub. From this repository, stage and commit the local files, then add the remote and push the existing `main` branch:

   ```powershell
   git add .
   git commit -m "Build Rowcraft sales reporting portfolio"
   git remote add origin https://github.com/mrl0r3/rowcraft-sales-automation.git
   git push -u origin main
   ```

2. In the repository, open **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**, and save.
3. Watch the `Deploy static demo to GitHub Pages` workflow. A successful workflow is the first evidence of deployment; then verify the repository's Pages URL.

No backend service is deployed by this workflow. The local FastAPI app is a separate technical demo.
