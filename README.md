# ✦ The Ballot Board '26

## November 3: private Parker & Blake mode

The app is now **a private two-person prediction board**. **Google/email sign-in controls and public community sign-up have been removed from the website.** Older how-to notes below are historical and are not needed for the current release.

### Safe handoff of phone-only predictions

- Open **the same browser on each phone where picks were originally saved** at [votemidterms2026.netlify.app](https://votemidterms2026.netlify.app). Safari, Chrome and an added Home Screen app can use different storage even on the same device.
- Tap **Our phones** → **Download a backup of this phone**. A backup includes original local predictions, locally entered winner calls and manually entered chamber totals. The app never deletes the original local save.
- To activate the live private board, Supabase must have **Anonymous Sign-Ins** enabled under **Authentication → Providers**. Each phone taps **Connect without Google or email**. This creates an anonymous device session, not a reusable email/password account.
- One person chooses their real profile name and **Create our two-person board**. Share the private invitation link/code with the second phone. The second person signs in anonymously (same one-button flow) and **joins** the existing board under their own name. A private board permits only 2 distinct participants.
- **Each phone** opens **Our phones → Import [name]’s saved picks**. The import is additive: skips existing online picks and called races, never erases original localStorage. Old party-only picks are preserved as party picks but may need a candidate selected to score.
- Wait until **both people finish importing picks** before entering or transferring any race calls. Once a call is recorded, that race's predictions lock to preserve fairness.
- The **Manager** tab groups the 124 tracked Senate, House and Governors races by scheduled **final poll-closing time (Central Standard Time)**, using [270toWin's 2026 timetable](https://www.270towin.com/poll-closing-times/). Mixed-timezone congressional districts have district-specific exceptions.
- If the anonymous session or browser storage is cleared, that device's account cannot be recovered automatically. Keep the original phone backups and avoid signing out or clearing browsing data. No Google auth required.



## Governors + Google privacy verification (November 3 update)

**36 gubernatorial elections** now appear in the **Governors** tab, including all nine [Ballotpedia battlegrounds](https://ballotpedia.org/Gubernatorial_battlegrounds,_2026) (AK, AZ, GA, IA, KS, MI, NV, OH, WI). Candidates and current incumbent governors are loaded from `governors.js`. Alaska includes all four round-one choices listed by Ballotpedia. This brings the board to **124 tracked races**. All existing scoring, state filters and completion tracking now include governors.

The governor results counter summarizes **manually entered calls in these 36 elections**, not the national partisan balance of 50 governorships. It should not be used as a verified election-results feed.

To address Google's OAuth consent-screen verification errors:

- The public **[Privacy Policy](https://votemidterms2026.netlify.app/privacy)** is now served via `privacy.html` and the `_redirects` rule for the exact `/privacy` path, and linked from the homepage footer.
- In Google Cloud Branding, use `https://votemidterms2026.netlify.app/` as the homepage and `https://votemidterms2026.netlify.app/privacy` as the privacy policy URL.
- Verify ownership of `https://votemidterms2026.netlify.app/` using a **URL-prefix** property in [Google Search Console](https://search.google.com/search-console). Select **HTML tag** verification; add the exact, user-specific `google-site-verification` meta tag within the homepage `<head>` and redeploy, then click Verify. Do not invent a verification token.
- Google's verification review may take time, and shared hosting domains sometimes require additional proof or a custom domain. The OAuth client must still be configured in Google Cloud, with the client credentials entered in Supabase only.

The policy describes which personal data are processed by Supabase, Google and Netlify. Update the support contact method if you want users to contact you privately rather than through the project issue tracker.


**Two prediction desks. One shared election-night scoreboard.**

A phone-friendly, retro-styled Parker-vs.-Blake 2026 midterm election game. Runs as a static website (no build command, no App Store). The interface works in **local preview** instantly, and switches to **two-account live sync** after Supabase is configured.

## Features

- Separate email magic-link sign-ins for each player.
- Private, two-person shared board with an invitation code.
- Each person can edit **only their own picks**.
- Both players can enter or clear **shared race calls** and **full-chamber seat totals**.
- Realtime cross-device updates through Supabase Postgres Changes.
- Automatic points and prediction accuracy based on manually called winners.
- All **35** Senate elections, with **12** Ballotpedia battlegrounds highlighted.
- **53** competitive House races rated Toss Up, Lean D, or Lean R in Cook's late-October/early-November ratings; **18** House toss-ups appear in Featured.
- Search, chamber filters, called/open/unpicked filters, animated design, and responsive phone layout.
- **No automatic results API.** Manual results are not independently verified by the app.

## ✿ Custom folk-art illustrations

The homepage and party imagery now use Parker's supplied artwork. The HTML/CSS layout is committed, but GitHub's text-only editor connection cannot attach the binary WebP files itself. To finish the images:

1. Download **ballot-board-art-assets.zip** from the ChatGPT response and unzip it.
2. Open the GitHub [assets directory](https://github.com/parkerpixie/Midterm_2026/tree/main/assets).
3. Select **Add file → Upload files**. Upload the **three WebP files** from the extracted assets folder, then **Commit changes**.
4. If Netlify is connected to GitHub, the images appear after the next deployment.

See [assets/README.md](assets/README.md) for file names and details.

## Google sign-in setup (recommended for recoverable community profiles)

The app now has **Continue with Google** in **Join / Profile**. It uses Supabase OAuth and returns to the same Netlify page, preserving invitation codes. **The button will not work until Google OAuth is enabled and configured in Supabase.**

1. In Supabase **Authentication → URL Configuration**, set Site URL to `https://votemidterms2026.netlify.app` and add `https://votemidterms2026.netlify.app/**` to allowed redirect URLs. This also addresses email confirmation links landing somewhere other than the app.
2. In [Google Cloud Auth Platform](https://console.cloud.google.com/auth/overview), create or select a Google Cloud project. Under **Branding**, give it the app name **The Ballot Board 2026** and choose your support email. Under **Audience**, choose **External** for friends using their personal Google accounts. If the app is in Testing, add specific test users; use **Publish app** for broader access when ready. Use only basic profile and email scopes.
3. Under **Clients**, create an **OAuth client ID**, choosing **Web application**. Under **Authorized JavaScript origins**, enter `https://votemidterms2026.netlify.app`.
4. Under **Authorized redirect URIs**, enter the **Supabase callback** (not the Netlify URL!): `https://omgradhyrdvjwrcpadtb.supabase.co/auth/v1/callback`.
5. Copy the new **Client ID** and **Client Secret** into [Supabase Authentication → Providers → Google](https://supabase.com/dashboard/project/omgradhyrdvjwrcpadtb/auth/providers). Enable the Google provider and save. **Do not commit your Client Secret to GitHub or paste it into the public website.**
6. Open the [live app](https://votemidterms2026.netlify.app), click **Join / Profile → Continue with Google**, complete Google's sign-in, and confirm the browser returns to the election app. Choose a nickname and create/join a challenge.
7. Test with a second Google account before sharing publicly on Facebook.

For exact current setup, see [Supabase's Google OAuth guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Final Supabase sign-in settings for this project

The current project is **MietermElection2026**. The core database and public Supabase connection are installed. Two dashboard changes remain:

1. In **Supabase → Authentication → URL Configuration**, set the site URL to `https://votemidterms2026.netlify.app` and add `https://votemidterms2026.netlify.app/**` to the allowed redirect URLs. This matters for email magic links.
2. In **Supabase → Authentication → Providers**, turn on **Anonymous Sign-Ins**. This unlocks the guest button so friends can play without being sent an email.

After changing the settings, test on two different browsers/devices before posting a Facebook invitation.

**Security note:** Anonymous sign-ins are convenient for a friends-only event but accounts are not recoverable after browser storage is cleared. Publicly sharing the invitation more widely can attract automated account creation. For a larger open-to-the-world competition, add bot protection and the corresponding frontend CAPTCHA flow.

## Joining and finding the leaderboard (community edition)

The site now has **Join / Profile** and **🏆 Leaderboard** buttons right in the header, plus a visible three-step explainer below the main banner.

**Before others can create profiles:** connect a dedicated Supabase project, run the latest `schema.sql`, and fill in the two **public** connection settings in `config.js` (see below). The existing Netlify site is **preview-only** until this is done.

**As the host:**
1. Open the deployed website and choose **Join / Profile**.
2. Sign in via email link, or choose the optional guest account (you must enable anonymous sign-ins in Supabase; guest profiles cannot be recovered after browser data is cleared).
3. Give yourself a display name. Select **Community Challenge**, then **Create challenge**.
4. Choose **Join / Profile** again, and **Copy invitation link**. Paste **that link**, not just the generic homepage URL, into Facebook.

**For friends:**
1. Open your invitation link, tap **Join / Profile**, and sign in with email or as a guest.
2. Enter a display name and tap **Join challenge**. Each person edits only their own candidate picks.
3. Use **🏆 Leaderboard** in the header to see ranked points and completion progress.

The **leaderboard is available for active Community Challenges**. If you're currently in a two-person private board, **Join / Profile → Create or join another challenge** to switch or create a community board. Called results may only be entered by that challenge's host. Predictions lock after each race is called.

**Incumbent labels:** each of the 88 race cards now displays who holds the seat and, where recorded, whether that official is not seeking reelection. Current-membership sources: [U.S. Senate](https://www.senate.gov/senators/) and [U.S. House](https://www.house.gov/representatives). For redrawn districts and vacancies, some seats display "not listed" or "vacant"; those labels deliberately avoid guessing.

**Art update:** the donkey and elephant image containers use `object-fit: contain` so their faces and full designs are visible instead of cropped.

## Open it tonight, fast

### 1. Deploy the GitHub repository to Netlify

1. In [Netlify](https://app.netlify.com/), choose **Add new project → Import an existing project**.
2. Choose **GitHub**, authorize if needed, and pick **parkerpixie/Midterm_2026**.
3. Set **build command** to *blank*. Set **publish directory** to the repository root (a single dot).
4. Deploy. Netlify will give you a link to open on either phone.

**At this point it is a preview only.** Switching Parker and Blake in Players changes a local persona, not a real signed-in user, and does **not** synchronize devices.

### 2. Add Supabase to enable actual users and sync

Use a **dedicated Supabase project** if possible, so it doesn't alter an older app. Supabase project availability/pricing depends on your account.

1. In [Supabase](https://supabase.com/dashboard), create or choose the project you've authorized for The Ballot Board.
2. Open **SQL Editor** and run the entire [schema.sql](schema.sql) script once.
3. Open **Project Settings → API Keys** (name may vary) and copy the **Project URL** and **publishable key**. A legacy anon key can also work. **Never put a secret/service_role key in this repository.**
4. Edit [config.js](config.js) on GitHub and fill in the two public values: the project URL in **supabaseUrl** and the publishable key in **publishableKey**.
5. Under **Authentication → URL Configuration** in Supabase, set **Site URL** to your actual Netlify address, and add that origin to **Redirect URLs** (for example, the full Netlify domain followed by /**).
6. For the simplest Facebook-friendly setup, go to **Authentication → Providers → Anonymous** in Supabase and enable anonymous sign-ins. New players can then tap **Join instantly as a guest**, choose a nickname, and join the shared board with the invitation code. Guest sessions live in that browser only and cannot be recovered after signing out or clearing browsing data. **Email magic links to arbitrary friends require custom SMTP**, because Supabase's default SMTP only sends to the project's authorized team addresses. Do not rely on email for Facebook sharing until custom SMTP is configured.
7. Let Netlify redeploy from the GitHub commit to config.js, then refresh the app.

### 3. Start the household showdown

- **Parker:** Open the Netlify URL on your phone. Select **Players**, enter your email, follow the sign-in link, choose your display name, and **Create our board**.
- Tap **Share our board** and send the invitation link to Blake.
- **Blake:** Open that link on his phone, sign in using **his own email**, enter his display name, and join the shared board using the prefilled invitation code.
- Now each player edits only their own predictions. Race calls and chamber totals belong to the shared board and update on both phones.

## How scoring and control work

A correct prediction earns one point after a player manually enters a called party for the race. Accuracy = correctly predicted called races / predicted races with a call. Races without entered results are not scored. D, R, and Other are available; a winner's party is not prefilled.

**The House/Senate big counters are NOT calculated from the featured-race cards.** The House has 435 elections, but this game follows only 53 competitive House districts. Instead, manually enter published **full-chamber called-seat totals** using "Update called-seat totals." That prevents the app from claiming control based on a partial watchlist.

For the Senate, the Democratic side is labeled **D + caucusing independents**; input those as one total. For 2026, a 50–50 tie is decided by the Republican vice president. The app distinguishes a reached threshold from an unconfirmed outcome.

The built-in categories are **external, dated watchlists**, not our forecasts or endorsements:
- Senate election dates and 13 battlegrounds: [Ballotpedia: U.S. Senate battlegrounds 2026](https://ballotpedia.org/U.S._Senate_battlegrounds,_2026), checked Nov. 3, 2026.
- House Toss Up / Lean categories: [Cook Political Report: House race ratings](https://www.cookpolitical.com/ratings/house-race-ratings), as seen Oct. 30–Nov. 2, 2026.

Results are **manually entered by players** and may contain errors; verify all calls through trustworthy election coverage before entering them. This is a game and an unofficial tracker, not an official election-results service.

## File guide

| File | Purpose |
|---|---|
| index.html | App structure and accessible dialogs |
| styles.css | Custom election-night graphics and mobile design |
| races.js | Hand-maintained election watchlist |
| app.js | Predictions, results, scoring, auth, sync |
| config.js | Two public Supabase connection values |
| schema.sql | Database tables, invite RPC, member-only RLS, Realtime |
| icon.svg | Custom ballot favicon |

## Security and privacy

- No passwords stored in this app. Supabase Auth handles login.
- Invite-only private rooms: 10-character randomly generated room codes; maximum two members.
- Database RLS prevents any player from modifying the other player's picks.
- Only members can see board data. The shared room stores email-account UUIDs and chosen display names, not email addresses.
- The **publishable key is public by design**; never use a privileged key in a website.
