

# Cover Letter Tailoring Tool

## Overview
A single-page app where Brett pastes a job posting URL, and the tool scrapes the job description and generates a lightly tailored version of his cover letter — swapping company name, role title, and adjusting 2-3 talking points to match the job.

## How It Works

### 1. Landing Page
A clean, simple interface with:
- A **URL input field** for the job posting link
- A **"Generate Cover Letter"** button
- Brett's base cover letter stored in the app as the template

### 2. Job Scraping (Firecrawl)
When the user submits a URL:
- The app calls a **Supabase Edge Function** that uses **Firecrawl** to scrape the job posting page
- Extracts the job title, company name, key responsibilities, and requirements as markdown

### 3. AI-Powered Tailoring (Lovable Cloud AI)
A second Edge Function sends the scraped job description + Brett's base cover letter to the AI with instructions to:
- Replace the company name and role title
- Adjust 2-3 talking points to align with the job's key requirements
- Keep Brett's core narrative, tone, and experience intact
- Maintain the same general structure and length

### 4. Results Display
- Shows a **loading state** while scraping and generating
- Displays the **tailored cover letter** as formatted text on screen
- Includes a **"Copy to Clipboard"** button for easy use

### 5. Retry Options
After viewing the result, two buttons are shown:
- **"Regenerate"** — rewrites the cover letter using the same job data and default instructions (produces a fresh variation)
- **"Rewrite with Instructions"** — opens a text input where Brett can type natural language guidance (e.g. "Emphasize my analytics experience more" or "Make the tone more casual") and the AI regenerates accordingly

Both options keep the same scraped job data so there's no need to re-scrape.

A **"New Job"** button is also available to start over with a different URL.

## Tech Stack
- **Firecrawl connector** → scrape job posting URLs
- **Lovable Cloud AI** → generate the tailored cover letter
- **Supabase Edge Functions** → backend for scraping + AI calls
- **React frontend** → simple, clean UI with the existing shadcn components

