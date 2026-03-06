# Chrome Extension — Integration Guide

## Overview

JobBot supports importing jobs from LinkedIn, Indeed, and other job boards via a Chrome extension.
The extension extracts job data from the current page and sends it to the JobBot app.

## API Endpoint

**Edge Function:** `import-job-external`

**Method:** POST

**Authentication:** Bearer token (JWT from Supabase Auth)

**Rate Limit:** 10 imports per hour per user

### Request Body

```json
{
  "source": "linkedin",       // required: "linkedin" | "indeed" | "other"
  "url": "https://...",       // required: job posting URL
  "jobTitle": "Engineer",     // optional
  "companyName": "Acme Inc",  // optional
  "jobDescription": "..."     // optional: extracted JD text
}
```

### Response

```json
{
  "success": true,
  "applicationId": "uuid",
  "source": "linkedin"
}
```

### Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | AUTH_REQUIRED | Missing Authorization header |
| 401 | AUTH_INVALID | Invalid or expired token |
| 429 | RATE_LIMITED | 10 imports/hour exceeded |
| 400 | VALIDATION_ERROR | Missing required fields |

## Deep Link

After extracting job data, the extension should open:

```
https://<app-domain>/import?url=<encoded-url>&source=linkedin&title=<title>&company=<name>
```

The import page shows a confirmation card before creating the application.

## Extension Architecture (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "JobBot Importer",
  "permissions": ["activeTab"],
  "content_scripts": [{
    "matches": [
      "https://www.linkedin.com/jobs/*",
      "https://www.indeed.com/viewjob*"
    ],
    "js": ["content.js"]
  }]
}
```

The content script detects job pages and injects an "Import to JobBot" button.
Clicking the button opens the deep link URL with extracted data.
