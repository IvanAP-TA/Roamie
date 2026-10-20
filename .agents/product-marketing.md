# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-20

The shared context every marketing skill (and the social and LinkedIn bots) reads first: what Roamie is, for whom,
and how it speaks. Facts here are checked against the product; anything still to confirm is marked *to collect*.

## Changelog

- **v1 · 2026-10-20** · First draft from the codebase: landing copy, README, guides, store listing, the bots'
  rules and decisions taken while building.

---

## 1. Product Overview

- **One line:** Roamie helps a group of friends decide their next trip together.
- **What it does:** Everyone proposes the places they'd love to visit and spreads 10 points across them (optionally
  in a secret round). A wheel weighted by the points picks the destination, live for the whole group, on the
  server so nobody can cheat. Then the group finds the dates that work for everyone, builds the itinerary day by
  day and shares a checklist.
- **Category (how people search):** group trip planner, "decide where to go with friends", travel bucket list,
  trip planning app for groups.
- **Type:** free web app (PWA, works in the browser, nothing to install), Android app in closed testing on Google
  Play. Italian, English and Spanish.
- **Business model:** free, no ads, no tracking cookies. No paid tier today.

## 2. Target Audience

- **Who:** groups of friends aged roughly 18–35 planning a trip together: long weekends, summer holidays, Erasmus and
  student trips, graduation trips, bachelor/bachelorette parties, couples travelling with friends.
- **The key person:** the friend who ends up organising. Roamie wins when the organiser brings the group in.
- **Primary use case:** turning "where should we go?" in the group chat into a decision everyone accepts.
- **Jobs to be done:**
  1. Collect everyone's ideas in one place instead of losing them in the chat.
  2. Decide fairly, so quieter friends get a say and nobody feels steamrolled.
  3. Move from the decision to the plan: dates, day-by-day itinerary, what to book and pack.

## 3. Personas

Not B2B. One informal "buying" dynamic inside a group:
- **The organiser:** creates the trip, invites friends, wants the decision done without becoming the bad guy.
- **The group members:** join with a link or a code, propose, vote; they want it quick and fair.

## 4. Problems & Pain Points

- Ideas get buried in the group chat; a week later nobody remembers what was agreed.
- The loudest voice (or the first opinion) wins; quieter friends don't push back.
- Too many options and no deadline, so nothing gets decided.
- Dates: half the group discovers they can't make it after the destination is picked.
- Money is awkward to talk about; people go quiet instead of saying a place is too expensive.
- One person ends up doing all the organising.

## 5. Competitive Landscape

- **Direct:** group trip apps (e.g. Troupe, Lambus) *(to verify they're still active before citing them)*.
- **Secondary:** trip planners for one organiser (Wanderlog, TripIt), date polls (Doodle, When2meet).
- **Indirect:** the group chat itself (WhatsApp polls), shared spreadsheets and notes.
- **Where they fall short:** planners start after the group has agreed; polls count votes but don't weigh them or
  make the decision; the chat is where decisions die.

## 6. Differentiation

- The decision is the product: weighted points plus a wheel turn a negotiation into a shared moment.
- Fairness built in: 10 points each, optional secret round, a draw on the server that can't be rigged.
- Zero friction for the group: a link or a short code, in the browser, nothing to install, free.
- From decision to plan in the same place: dates by availability, itinerary, checklist, map, passport of trips.
- 12 travel guides for groups, every place addable to a trip in one tap.
- Privacy: no ads, no profiling cookies, no trackers, data export and account deletion.

## 7. Objections & Anti-Personas

- *"We'll just use a WhatsApp poll."* → A poll counts replies; Roamie weighs them, remembers every idea, and ends with
  a decision and a plan.
- *"Another app to install."* → Nothing to install; it opens from a link in the browser.
- *"Is it free? What's the catch?"* → Free, no ads, no tracking.
- **Not a fit:** solo travellers; people who want to book flights and hotels inside the app (Roamie doesn't sell
  travel); corporate travel managers.

## 8. Switching Dynamics

- **Push:** endless group chats, the same person always deciding, trips that never happen.
- **Pull:** a fair, quick, slightly playful way to decide; one place for ideas, dates and plan.
- **Habit:** "we always do it in the chat"; inertia of the organiser's spreadsheet.
- **Anxiety:** that friends won't join a new tool; that it's work to set up. Answer: one link, a sample trip to try
  without an account.

## 9. Customer Language

- **How people describe the problem (verbatim):** *to collect* (from Reddit research and testers; never invent).
- **How they describe Roamie (verbatim):** *to collect*.
- **Use:** group trip, friends, decide together, propose, vote, points, the wheel, the next trip, bucket list.
- **Avoid:** hype ("game-changer", "revolutionary", "seamless", "unlock", "supercharge"), "AI-powered" as a selling
  point, invented statistics, "users" in public copy (say friends, groups, people).
- **Glossary:** *trip* (a group's plan), *places/mete* (proposed destinations), *points* (10 per person), *the wheel*
  (the weighted draw), *secret round* (votes hidden until the reveal), *passport* (places you've been).

## 10. Brand Voice

1. **Warm and plain.** Talks like a friend who organises well. Not cute, not salesy.
   *"Raccogliete i posti che sognate, votateli con gli amici e lasciate che la ruota scelga."*
2. **Humble and honest.** Says what it does, never more; no numbers that aren't true.
   *"Free, no ads, no trackers."*
3. **A little playful, about the decision only.** The wheel is the fun part; the rest is calm and useful.
   *"Kyoto estratta!"*

- **Tone by context:** product UI short and kind; guides informative and concrete; social posts friendly with one
  question at the end; LinkedIn calm, first person plural ("we"), no emoji, no exclamation marks.
- **Never:** emoji-heavy copy, em/en dashes in social and LinkedIn texts (they read as AI-written), italic emphasis
  in headings, hype words.

## 11. Proof Points

- No public metrics yet: early stage, launched mid-September 2026. Don't cite user numbers until they are worth
  citing and confirmed.
- Verifiable product facts: 12 guides, 66 places, 3 languages, 575 public pages; free; no trackers.
- Testimonials: *to collect* from testers (with permission).

## 12. Goals

- **Primary goal:** groups that complete a decision (a trip with 2+ members and a wheel spin).
- **Key conversion:** the organiser creates a trip and invites friends (sign in with Google, or try the sample trip
  without an account).
- **Channels in place:** SEO (guides, months, comparisons), daily social posts (Instagram, Facebook, TikTok,
  YouTube Shorts), daily LinkedIn company posts, Product Hunt launch.

## 14. Learnings

- AI-written posts must be built from facts the bot supplies; an earlier LinkedIn post invented landmarks, and a
  weekly post told bot fixes as user features. Both are now blocked by checks.
- Long dashes and identical openings make posts read as AI or as repeats.
