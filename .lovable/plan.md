## Replace Testimonials Carousel with Enhancv-style Social Proof Section

### What changes

**Archive**: Move the current `TESTIMONIALS` array, `TestimonialCard`, `ROW1`/`ROW2`, and `Testimonials()` component into a  hidden archive.

**Replace with**: An enhancv-inspired "Trusted by professionals" section featuring:

1. **Stats bar** -- 4 large stats in a row: "600,000+ Portfolios Created", "1M+ Resumes created", "", "Land your dream job 4 x FASTER"
2. **Review cards** -- 3 static testimonial cards in a grid (pick 3 best from existing data), each with star rating, quote, name, company, and a subtle time-ago label
3. **Social proof badge** -- centered aggregate rating with star icons and review count

### Layout (single file: `src/pages/Landing.tsx`)

```text
┌─────────────────────────────────────────────────┐
│          Trusted by Professionals               │
│    Join thousands who landed their dream role    │
│                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │600K+│  │ 10K+ │  │ 4.9  │  │ Land  │        │
│  │portfol│  │compan│  │rating│  │FASTER │        │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ ★★★★★   │  │ ★★★★★   │  │ ★★★★★   │         │
│  │ "quote" │  │ "quote" │  │ "quote" │         │
│  │ Name    │  │ Name    │  │ Name    │         │
│  │ Company │  │ Company │  │ Company │         │
│  └─────────┘  └─────────┘  └─────────┘         │
└─────────────────────────────────────────────────┘
```

### Technical details

- Remove and archive `TESTIMONIALS` array, `TestimonialCard`, `ROW1`, `ROW2`, `Testimonials` function
- Removeand archive marquee CSS classes from `src/index.css` (`animate-marquee`, `animate-marquee-reverse`, `@keyframes marquee`, `@keyframes marquee-reverse`)
- Add new `SocialProof()` component with:
  - Stats grid: `grid-cols-2 sm:grid-cols-4` with large numbers + labels
  - 3 review cards: `grid-cols-1 sm:grid-cols-3`, each with 5 gold `Star` icons, quote text, avatar initial, name, company, and a "2 weeks ago" style label
  - Use `Star` from lucide-react (filled gold)
- Keep 3 of the best testimonials from the existing data (Sarah M./Deloitte, Tom H./KPMG, Ryan P./State Farm)
- Replace `<Testimonials />` with `<SocialProof />` in the `Landing` component

### Files changed

- `src/pages/Landing.tsx` -- remove old testimonials, add new `SocialProof` component
- `src/index.css` -- remove marquee keyframes/classes