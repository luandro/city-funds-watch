# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

---

## Landing Page Architecture (Participation-First)

The landing page has been redesigned with a **participation-first** information architecture. The page prioritizes civic participation over fiscal data.

### Landing Page Modes (State Machine)

The landing page operates in one of four mutually exclusive states:

| Mode | Trigger | UI Display |
|------|---------|------------|
| **LIVE NOW** | `liveSession.isLive === true` | Live badge, watch button, tabbed panel (Summary/Transcript/Agenda/Questions) |
| **NEXT HEARING** | Scheduled hearing exists | Hearing card with countdown, topics, CTAs |
| **NO HEARINGS** | No hearings found | Fallback message with link to official calendar |
| **ERROR** | Data fetch fails | Error message with retry button and cached data |

### Section Hierarchy

1. **Participar Agora (Participation Now)** - Always above the fold
   - Shows live session OR next scheduled hearing OR fallback
   - Questions panel with Reddit-like voting (up/down, sort by Top/New/Answered)

2. **Personalize (Make It Yours)**
   - Neighborhood selector (search + select, with "Whole city" option)
   - Topic following (suggested topics + full list, saved to localStorage)

3. **Seu Feed Cívico (Your Civic Feed)**
   - Filtered by neighborhood + followed topics
   - Three sub-sections:
     - "Acontecendo agora" (Happening now)
     - "Atrasados / Em risco" (Delayed / At risk)
     - "O que mudou esta semana" (What changed this week)

4. **Dinheiro, resumido (Money, briefly)**
   - Shows spending for followed topics only (max 3 cards)
   - Local spend headline card linking to deep dive

### Data Models

New types added to `/src/data/types.ts`:

- `Hearing` - Scheduled public hearings
- `LiveSession` - Live session data (agenda, transcript, summary)
- `Question` - User questions with voting
- `FeedItem` - Civic activity feed items
- `UserPreferences` - Neighborhood + followed topics (localStorage)

### Mock Data

Mock data is in `/src/data/mockData.ts`:

- `mockNextHearing` / `mockHearingSchedule` - Hearing data
- `mockLiveSession` - Live session (set `isLive: true` to test live mode)
- `mockQuestions` - Sample questions with votes
- `mockFeedItems` - Civic feed items
- `mockTopicMoneySummaries` - Spending by topic
- `NEIGHBORHOODS` / `TOPICS` / `SUGGESTED_TOPICS` - Reference data

### Testing Live Mode

To test the "Live Now" mode, edit `/src/data/mockData.ts` and set:

```typescript
export const mockLiveSession: LiveSession = {
  // ...
  isLive: true,  // Change this to true
  // ...
};
```

### Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ParticipationNow` | `/src/components/ParticipationNow.tsx` | Main state-machine wrapper |
| `LiveSessionPanel` | `/src/components/LiveSessionPanel.tsx` | Tabbed panel for live sessions |
| `NextHearingCard` | `/src/components/NextHearingCard.tsx` | Upcoming hearing card |
| `QuestionsPanel` | `/src/components/QuestionsPanel.tsx` | Reddit-like Q&A |
| `MakeItYours` | `/src/components/MakeItYours.tsx` | Personalization section |
| `CivicFeed` | `/src/components/CivicFeed.tsx` | Filtered activity feed |
| `MoneyBriefly` | `/src/components/MoneyBriefly.tsx` | Topic-specific spending |

### User Preferences (localStorage)

Stored under key `bh-transparente-preferences`:

```typescript
interface UserPreferences {
  neighborhood: string | null;  // null = "Whole city"
  followedTopics: string[];
}
```

Use the "Limpar preferências" button to reset.

## Future TODOs

These improvements are documented for when the project moves to production:

### API Integration
- [ ] **Consolidate initial data fetching** - When connecting to a real backend, consider creating a single `getInitialPageData()` endpoint that returns all landing page data in one request, reducing HTTP overhead. Currently documented in `src/pages/Index.tsx`.

### Performance
- [x] **Code splitting** - Implemented with React.lazy for below-the-fold components (MakeItYours, CivicFeed, MoneyBriefly)
- [x] **Vendor chunking** - Configured in `vite.config.ts` to split React, Radix UI, and Recharts into separate chunks

### Security (Implemented)
- [x] **URL validation** - Prevents `javascript:`, `data:` and other unsafe URL schemes (`src/utils/urlValidation.ts`)
- [x] **localStorage validation** - Schema validation with size limits (`src/hooks/useUserPreferences.ts`)
- [x] **Error sanitization** - Internal errors are not exposed to users (`src/data/dataService.ts`)

### Accessibility
- [ ] **Screen reader testing** - Full accessibility audit with NVDA/VoiceOver
- [ ] **Keyboard navigation** - Ensure all interactive elements are keyboard accessible
- [ ] **ARIA labels** - Add comprehensive ARIA labels for complex components

### Internationalization
- [ ] **i18n framework** - Currently hardcoded in Portuguese (pt-BR), consider adding i18next for multi-language support

### Testing
- [ ] **Unit tests** - Add Jest/Vitest tests for utilities and hooks
- [ ] **Component tests** - Add React Testing Library tests for key components
- [ ] **E2E tests** - Add Playwright tests for critical user flows

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
