# Publication and GitHub Pages

The public repository is [MRL0R3/rowcraft-sales-automation](https://github.com/MRL0R3/rowcraft-sales-automation). The static demo is live at [mrl0r3.github.io/rowcraft-sales-automation](https://mrl0r3.github.io/rowcraft-sales-automation/). The Vite build uses relative `./assets/...` URLs, which work for both the local preview and GitHub Pages project subpaths. The Pages workflow injects the actual repository URL into the source link at build time.

Pages is configured with **GitHub Actions** as its source. Every push to `main` runs the [Pages workflow](https://github.com/MRL0R3/rowcraft-sales-automation/actions/workflows/pages.yml); pull requests and pushes also run [CI](https://github.com/MRL0R3/rowcraft-sales-automation/actions/workflows/ci.yml). The first successful deployment was verified on 7 November 2026, along with an HTTP 200 response from the live URL.

No backend service is deployed by this workflow. The local FastAPI app is a separate technical demo.
