# Security and privacy

The browser demo parses selected files locally and does not send them to a server. The FastAPI sample is intended for local use only. Do not expose it to the public internet without authentication, deployment hardening, request limits at the hosting layer, and an explicit privacy/security review.

Never commit customer files, secrets, credentials, or personally identifying data. The sample fixtures contain synthetic records. Exported CSV text is protected against spreadsheet formula execution by prefixing formula-leading cells; treat reports as business data and store them appropriately.

Report suspected vulnerabilities through the repository owner's GitHub profile. Do not include customer data in public issues.
