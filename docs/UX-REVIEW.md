# Room booking — UI/UX review

**User goal (from the README scenario):** a student needs to *find dates for a common room, reserve it, and later adjust their own reservation.*

I used the starter app as that student at two widths (≈800 px laptop split-screen and 1440 px desktop): browse the week, pick a room, book it, deliberately try a conflicting booking, then change one of "my" bookings.

---

## Problem 1 — A failed booking never says *why*

**What happens.** Clicking **Confirm booking** with any problem — empty room, end before start, or an overlap — always shows the same banner: *"Reservation failed. Review the selected dates."* `submit()` computes the precise reason with `issue()` and then throws it away. If the room is empty, the message even points the user at the wrong field (the dates). For an overlap, it doesn't say which booking is in the way or what to try instead.

**Why it hurts.** Error recovery is the most expensive moment in a form. The student has to guess what's wrong, scroll back to the calendar, and find the conflict by hand — and the "Check availability" button gives a *different* (more precise) message than the real submit, so the two disagree.

| Alternative | Pros | Cons |
|---|---|---|
| A. Pass the `issue()` text through to the banner | One-line fix, consistent with *Check availability* | Still doesn't show *which* booking conflicts or how to fix it |
| B. **Specific message + mark the offending fields + list the conflicting booking(s) + one-click "Try the next free dates"** | User sees the cause, where to fix it, and has a direct recovery path | More UI; a suggestion could be surprising if applied without asking (so it's a button, never automatic) |
| C. Disable *Confirm* until the form is valid | Prevents the error entirely | Disabled buttons don't explain themselves; hides the reason, breaks the "Check availability" mental model |

**Chosen: B.** Validation rules are untouched (`issue()` still decides validity); only the presentation changed.

## Problem 2 — The calendar invites impossible bookings and can't select a range

**What happens.** Every cell is a button with the same hover outline. Clicking a **Booked** cell copies that already-taken date into the form, guaranteeing a failure on submit. Clicking your *own* booking also starts a brand-new booking instead of opening it for changes. A click only ever selects one day, so a multi-day booking means typing the end date by hand. "Your booking" is only small grey text — the same colour as everyone else's reservation.

**Why it hurts.** The calendar is the primary way to "find dates", but it treats unavailable and available days identically, so the interface itself leads the user into Problem 1. Multi-day study sessions are common but awkward to enter.

| Alternative | Pros | Cons |
|---|---|---|
| A. Only make reserved cells non-interactive | Minimal; removes the trap | Still single-day only; own bookings still not editable from the calendar |
| B. Drag to select a range | Familiar from calendar apps | Poor on touch and impossible by keyboard; easy to mis-drag |
| C. **Two clicks: first = start day, second (same room) = last day; others' bookings inert; your bookings open in edit mode; selected range highlighted** | Works with mouse, touch and keyboard; the selection is visible on the grid | Second click changes meaning — mitigated by a live hint ("Now click the last day…") |

**Chosen: C.** Rejected B for accessibility. After user feedback, selected days toggle off: clicking the first or last day of a range removes just that day (so a range can be shortened without starting over), clicking a middle day or a single selected day clears the selection. A middle day clears rather than splits, because a booking must be one continuous range. Ranges can only be completed if every day in between is free; otherwise the click simply starts a new selection.

## Problem 3 — "Change" edits a booking somewhere you can't see

**What happens.** On a desktop width the form sits at the top-right and "Your bookings" sits ~1,400 px lower, under all 18 rooms. Clicking **Change** silently flips the off-screen form into edit mode: nothing visible changes. The list gives no sign which booking is being edited, and the form doesn't say which booking it's editing either. "Cancel editing" also leaves an old success message on screen.

**Why it hurts.** "Later adjust their own reservation" is one third of the scenario. Users who click and see nothing click again or assume it's broken; if they do find the form, they can't confirm they're editing the right booking.

| Alternative | Pros | Cons |
|---|---|---|
| A. Scroll to the form and focus it on *Change* | Simple; works at every width | Jumps the page away from the list and calendar |
| B. Inline editing inside the booking card | Edit happens where you clicked | Duplicates the form, its validation and its errors — two sources of truth |
| C. Modal dialog | Focused task | Hides the calendar you need to pick new dates |
| D. **Sticky booking panel on wide screens + scroll/focus on narrow screens; highlight the card being edited and show "Changing: room · dates · purpose" in the form** | Calendar and form stay visible together; clear context; one form | Sticky panel needs a max-height so it fits short screens |

**Chosen: D** (combines A for narrow screens with a persistent panel for wide ones).

**Refined after user testing.** The first version let free-day clicks *move* the booking being edited. A tester clicked their booking, then a free day, and the yellow "editing" state stayed on, which read as stuck. A click on a free day now always starts a new booking and leaves edit mode. Existing bookings are moved by changing the dates in the form, and the calendar hint says so while editing.

## Bonus — the date range shown didn't match the calendar

End dates are exclusive (a booking `9 Nov → 10 Nov` occupies only 9 Nov), but "Your bookings" printed `9 Nov – 10 Nov`, while the calendar shows only Monday booked. Lists now show the days actually reserved (`9 Nov · 1 day`, `17–18 Nov · 2 days`), and the form shows a live "Reserves … · N days — the end date stays free" line. The stored data and the "end strictly after start" rule are unchanged.

---

## An AI suggestion I refined / rejected

The first AI suggestion for Problem 2 was **"replace the end-date input with a 'number of days' stepper and disable submit until the range is conflict-free."** I rejected it:

- It removes the `endDate` field from the prior-lab data model the brief says to preserve.
- Disabling submit hides the reason (that's Problem 1 again).

I kept the AI's underlying idea — *make the range explicit* — but delivered it as the two-click range on the calendar plus a plain-language "Reserves Mon 9 Nov – Tue 10 Nov · 2 days" summary under the existing date fields.

## Preserved behaviour

- Same validation (`issue()`), same three messages, same overlap rule, same `localStorage` key and format.
- Create, edit, cancel editing, Check availability, Reset demo, week navigation, room filter and the room datalist all still work.

## Demo / test log

Run with `npm run dev`; data reset with **Reset demo** first. Screenshots are in [`screenshots/`](screenshots/).

| # | Step | Result | Screenshot |
|---|---|---|---|
| Before | Click a **Booked** cell, then *Confirm booking* | Form filled with a taken date; banner just says "Reservation failed. Review the selected dates." | `before-1-calendar.jpg`, `before-2-generic-error.jpg` |
| Before | Desktop: click **Change** under "Your bookings" | Form switches to edit mode ~1,100 px above the viewport; nothing visible changes | `before-3-change-offscreen.jpg` |
| **Main action** | Click A3-209 Thu 12 Nov, then Sat 14 Nov; add purpose; *Confirm booking* | Three days highlighted, form shows "Reserves 12 Nov – 14 Nov · 3 days"; after confirm: "Room reserved: A3-209, 12 Nov – 14 Nov · 3 days.", cells turn "Yours", persists after reload | `after-1-range-selection.jpg`, `after-2-booking-confirmed.jpg` |
| **Unsuccessful action** | Type B2-104, 13 → 15 Nov; *Confirm booking* | "This room is already booked for some of those dates." + "B2-104 is reserved 13 Nov – 14 Nov · 2 days", date fields outlined red, button "Use next free dates: 15 Nov – 16 Nov · 2 days" (applies 15 → 17 Nov, which is free) | `after-3-specific-error.png` |
| Fix 1 | Empty room / end before start | "Complete the room and both dates." with the room field marked; "End date must follow start date." with the end field marked | — |
| Fix 2 | Click someone else's booked cell | Not selectable (striped, `not-allowed` cursor); form untouched | `after-1-range-selection.jpg` |
| Fix 2 | Click your own booking cell (A3-209 Thu) | Opens it in *Change reservation* | — |
| Fix 3 | Desktop: click **Change** on A2-107 | Sticky form is in view in edit mode, card shows "Editing", form says "Changing your booking: A2-107, 9 Nov · 1 day — Student club planning" | `after-4-change-in-view.jpg` |
| Fix 3 | While editing, change the dates in the form to 15 → 16 Nov; *Save booking* | "Booking updated: A2-107, 15 Nov · 1 day."; purpose kept; no duplicate booking | — |
| Fix 3 | While editing, click a free day (A2-107 Tue) | Edit mode ends: yellow highlight and "Editing" tag clear, form becomes *Make a reservation* for a new booking; the original booking is untouched | — |
| Fix 2 | Select A3-209 Thu → Sat, click Sat, then Fri | Each click removes that last day: 12–14 → 12–13 → 12 Nov only; end cells are labelled "Click to remove" | `after-6-deselect.png` |
| Fix 2 | Click the first day of a range / a middle day / a single selected day | First day trims the start (13–14 Nov); middle or single day clears the selection, keeping any purpose typed ("Click to clear") | `after-6-deselect.png` |
| Fix 3 | While editing, click the booking being changed again | Leaves edit mode, same as *Cancel editing* | — |
| Narrow (800 px) | Select a range | Sticky bar "Selected: A1-203, 11 Nov – 12 Nov · 2 days — Review booking ↓" keeps the form one tap away | `after-5-narrow-selection-bar.jpg` |
| Regression | Check availability, Cancel editing, Reset demo, `vite build` | All work; Reset restores 40 bookings / 8 of yours; build passes | — |
